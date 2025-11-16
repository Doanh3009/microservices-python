# orders_service.py
from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, Float, String, text, exc
from sqlalchemy.orm import declarative_base, sessionmaker
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("ORDERS_DB") # Đọc ORDERS_DB
ORDERS_PORT = int(os.getenv("ORDERS_PORT", 5003))

USERS_BASE = os.getenv("USERS_BASE", "http://localhost:5001")
PRODUCTS_BASE = os.getenv("PRODUCTS_BASE", "http://localhost:5002")

# === LOGIC TỰ TẠO DATABASE ===
def init_db():
    master_engine = create_engine(
        f"mssql+pymssql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/master",
        isolation_level="AUTOCOMMIT"
    )
    
    retries = 5
    while retries > 0:
        try:
            with master_engine.connect() as conn:
                conn.execute(text(f"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{DB_NAME}') CREATE DATABASE [{DB_NAME}]"))
            print(f"Database '{DB_NAME}' is ready.")
            break
        except exc.SQLAlchemyError as e:
            print(f"Error creating database (hoặc DB chưa sẵn sàng): {e}")
            retries -= 1
            time.sleep(5)
    
    master_engine.dispose()
    if retries == 0:
        raise Exception(f"Không thể tạo hoặc kết nối đến database {DB_NAME}")

    db_engine = create_engine(f"mssql+pymssql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}", pool_pre_ping=True)
    return db_engine
# ===============================

engine = init_db()
Base = declarative_base()
Session = sessionmaker(bind=engine)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer)
    product_ids = Column(String(1000))  # comma-separated: "1,2,3"
    total = Column(Float)
    # --- THÊM DÒNG NÀY ---
    status = Column(String(50), default="Pending") # Trạng thái: Pending, Delivering, Completed

Base.metadata.create_all(engine)

# ---- Simple in-memory cache with TTL ----
_cache = {}
def cache_set(key, value, ttl=30):
    _cache[key] = (time.time() + ttl, value)

def cache_get(key):
    v = _cache.get(key)
    if not v:
        return None
    expiry, value = v
    if time.time() > expiry:
        del _cache[key]
        return None
    return value

# ---- Helper: fetch products in batch or parallel with timeout ----
REQUEST_TIMEOUT = 2  # seconds for external service calls
MAX_WORKERS = 8

def try_batch_fetch_products(ids):
    """Try /products?ids=1,2,3 (if product service supports it). Return dict id->product or None."""
    try:
        ids_param = ",".join(map(str, ids))
        url = f"{PRODUCTS_BASE}/products?ids={ids_param}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            # expecting list of products [{id:.., price:.., ...}]
            return {int(p['id']): p for p in data}
    except Exception:
        pass
    return None

def fetch_product_by_id(pid):
    try:
        url = f"{PRODUCTS_BASE}/products/{pid}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            return int(pid), resp.json()
    except Exception:
        pass
    return int(pid), None

def get_products_by_ids(ids):
    """Return dict id -> product (product may be None if not found). Caches results for TTL."""
    ids = list({int(i) for i in ids})  # unique
    result = {}
    # check cache first
    to_fetch = []
    for pid in ids:
        cached = cache_get(f"product:{pid}")
        if cached is not None:
            result[pid] = cached
        else:
            to_fetch.append(pid)

    if not to_fetch:
        return result

    # try batch endpoint first
    batch = try_batch_fetch_products(to_fetch)
    if batch is not None:
        for pid in to_fetch:
            prod = batch.get(pid)
            result[pid] = prod
            cache_set(f"product:{pid}", prod, ttl=30)
        return result

    # fallback to parallel single fetches
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(to_fetch))) as ex:
        futures = {ex.submit(fetch_product_by_id, pid): pid for pid in to_fetch}
        for fut in as_completed(futures):
            pid = futures[fut]
            try:
                _pid, prod = fut.result()
                result[pid] = prod
                cache_set(f"product:{pid}", prod, ttl=30)
            except Exception:
                result[pid] = None
                cache_set(f"product:{pid}", None, ttl=10)
    return result

# ---- Helper: fetch users in batch or parallel with timeout ----
def try_batch_fetch_users(ids):
    try:
        ids_param = ",".join(map(str, ids))
        url = f"{USERS_BASE}/users?ids={ids_param}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            return {int(u['id']): u for u in data}
    except Exception:
        pass
    return None

def fetch_user_by_id(uid):
    try:
        url = f"{USERS_BASE}/users/{uid}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            return int(uid), resp.json()
    except Exception:
        pass
    return int(uid), None

def get_users_by_ids(ids):
    ids = list({int(i) for i in ids})
    result = {}
    to_fetch = []
    for uid in ids:
        cached = cache_get(f"user:{uid}")
        if cached is not None:
            result[uid] = cached
        else:
            to_fetch.append(uid)

    if not to_fetch:
        return result

    batch = try_batch_fetch_users(to_fetch)
    if batch is not None:
        for uid in to_fetch:
            user = batch.get(uid)
            result[uid] = user
            cache_set(f"user:{uid}", user, ttl=30)
        return result

    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(to_fetch))) as ex:
        futures = {ex.submit(fetch_user_by_id, uid): uid for uid in to_fetch}
        for fut in as_completed(futures):
            uid = futures[fut]
            try:
                _uid, user = fut.result()
                result[uid] = user
                cache_set(f"user:{uid}", user, ttl=30)
            except Exception:
                result[uid] = None
                cache_set(f"user:{uid}", None, ttl=10)
    return result

# ---- Utilities for parsing/storing product_ids ----
def parse_product_ids_field(field):
    if field is None or field == "":
        return []
    if isinstance(field, list):
        return [int(x) for x in field]
    # stored as "1,2,3"
    return [int(x) for x in str(field).split(",") if x.strip()]

def product_list_to_field(lst):
    return ",".join(map(str, lst))

# ---- Routes ----

@app.route("/orders", methods=["POST"])
def create_order():
    session = Session()
    try:
        data = request.json or {}
        user_id = data.get("user_id")
        product_ids = data.get("product_ids", [])
        if isinstance(product_ids, str):
            # accept comma-separated on input
            product_ids = parse_product_ids_field(product_ids)

        if not user_id or int(user_id) <= 0:
            return jsonify({"error": "User ID must be positive"}), 400

        if not product_ids:
            return jsonify({"error": "Please select at least one product"}), 400

        product_ids = [int(x) for x in product_ids]
        # Fetch product details in batch (fast) and compute total
        prods = get_products_by_ids(product_ids)
        total = 0.0
        missing = []
        for pid in product_ids:
            p = prods.get(pid)
            if p and 'price' in p and p['price'] is not None:
                try:
                    total += float(p['price'])
                except Exception:
                    # if price invalid, skip
                    pass
            else:
                missing.append(pid)

        if missing:
            # don't block creation because of remote service — still allow but warn
            # you can decide to reject instead; here we allow but set price 0 for missing
            # return jsonify({"error": f"Some products not found: {missing}"}), 400
            pass

        product_ids_str = product_list_to_field(product_ids)
        custom_id = data.get("id")

        if custom_id:
            custom_id = int(custom_id)
            if custom_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
            existing = session.query(Order).filter(Order.id == custom_id).first()
            if existing:
                return jsonify({"error": "ID already exists"}), 409
            try:
                session.execute(text("SET IDENTITY_INSERT orders ON"))
                # --- SỬA DÒNG NÀY ---
                order = Order(id=custom_id, user_id=int(user_id), product_ids=product_ids_str, total=total, status="Pending")
                session.add(order)
                session.commit()
                session.execute(text("SET IDENTITY_INSERT orders OFF"))
                session.commit()
                return jsonify({"message": "Order created with custom ID", "id": order.id, "total": total}), 201
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT orders OFF"))
                session.commit()
                return jsonify({"error": str(e)}), 500
        else:
            # --- SỬA DÒNG NÀY ---
            order = Order(user_id=int(user_id), product_ids=product_ids_str, total=total, status="Pending")
            session.add(order)
            session.commit()
            return jsonify({"message": "Order created", "id": order.id, "total": total}), 201

    except ValueError:
        return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/orders", methods=["GET"])
def list_orders():
    session = Session()
    try:
        search = request.args.get('search', '').strip()
        query = session.query(Order)
        if search:
            try:
                search_id = int(search)
                query = query.filter((Order.id == search_id) | (Order.user_id == search_id))
            except ValueError:
                pass

        orders = query.all()
        if not orders:
            return jsonify([])

        # gather unique user_ids and product_ids across all orders
        user_ids = set()
        product_ids = set()
        for o in orders:
            user_ids.add(o.user_id)
            for pid in parse_product_ids_field(o.product_ids):
                product_ids.add(pid)

        users_map = get_users_by_ids(list(user_ids)) if user_ids else {}
        products_map = get_products_by_ids(list(product_ids)) if product_ids else {}

        result = []
        for o in orders:
            pids = parse_product_ids_field(o.product_ids)
            # build product objects (or minimal info)
            products_info = []
            for pid in pids:
                prod = products_map.get(pid)
                if prod:
                    products_info.append({"id": pid, "name": prod.get("name"), "price": prod.get("price")})
                else:
                    products_info.append({"id": pid, "name": None, "price": None})

            u = users_map.get(o.user_id)
            user_name = u.get("name") if u else "Unknown"

            result.append({
                "id": o.id,
                "user_id": o.user_id,
                "user_name": user_name,
                "product_ids": o.product_ids,
                "product_list": products_info,
                "total": o.total,
                # --- THÊM DÒNG NÀY ---
                "status": o.status
            })
        return jsonify(result)
    finally:
        session.close()

@app.route("/orders/<int:id>", methods=["GET"])
def get_order(id):
    session = Session()
    try:
        order = session.query(Order).filter(Order.id == id).first()
        if not order:
            return jsonify({"error": "Order not found"}), 404

        pids = parse_product_ids_field(order.product_ids)
        products_map = get_products_by_ids(pids) if pids else {}
        products_info = []
        for pid in pids:
            prod = products_map.get(pid)
            if prod:
                products_info.append({"id": pid, "name": prod.get("name"), "price": prod.get("price")})
            else:
                products_info.append({"id": pid, "name": None, "price": None})

        users_map = get_users_by_ids([order.user_id])
        u = users_map.get(order.user_id)
        user_name = u.get("name") if u else "Unknown"

        return jsonify({
            "id": order.id,
            "user_id": order.user_id,
            "user_name": user_name,
            "product_ids": order.product_ids,
            "product_list": products_info,
            "total": order.total,
            # --- THÊM DÒNG NÀY ---
            "status": order.status
        })
    finally:
        session.close()

@app.route("/orders/<int:id>", methods=["PUT"])
def update_order(id):
    session = Session()
    try:
        data = request.json or {}
        order = session.query(Order).filter(Order.id == id).first()
        if not order:
            return jsonify({"error": "Order not found"}), 404

        new_id = data.get("id")
        if new_id and int(new_id) != id:
            new_id = int(new_id)
            if new_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
            existing = session.query(Order).filter(Order.id == new_id).first()
            if existing:
                return jsonify({"error": "New ID already exists"}), 409

            # Preserve other fields if not provided
            new_user_id = int(data.get("user_id", order.user_id))
            new_product_ids_field = data.get("product_ids", order.product_ids)
            if isinstance(new_product_ids_field, list):
                new_product_ids = new_product_ids_field
            else:
                new_product_ids = parse_product_ids_field(new_product_ids_field)

            # recalc total
            prods = get_products_by_ids(new_product_ids)
            total = 0.0
            for pid in new_product_ids:
                p = prods.get(pid)
                if p and p.get("price") is not None:
                    try:
                        total += float(p["price"])
            # SỬA: Lấy status cũ
            old_status = order.status
            
            # delete and re-insert with new id (since you're doing identity insert)
            session.delete(order)
            session.commit()
            try:
                session.execute(text("SET IDENTITY_INSERT orders ON"))
                # SỬA: Thêm status
                new_order = Order(
                    id=new_id, 
                    user_id=new_user_id, 
                    product_ids=product_list_to_field(new_product_ids), 
                    total=total,
                    status=data.get("status", old_status) # Thêm dòng này
                )
                session.add(new_order)
                session.commit()
                session.execute(text("SET IDENTITY_INSERT orders OFF"))
                session.commit()
                return jsonify({"message": "Order updated with new ID", "new_id": new_id}), 200
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT orders OFF"))
                session.commit()
                return jsonify({"error": str(e)}), 500
        else:
            # update without changing ID
            if "user_id" in data:
                order.user_id = int(data["user_id"])
            if "product_ids" in data:
                product_ids_field = data["product_ids"]
                if isinstance(product_ids_field, list):
                    product_ids = product_ids_field
                else:
                    product_ids = parse_product_ids_field(product_ids_field)
                prods = get_products_by_ids(product_ids)
                total = 0.0
                for pid in product_ids:
                    p = prods.get(pid)
                    if p and p.get("price") is not None:
                        try:
                            total += float(p["price"])
                        except Exception:
                            pass
                order.product_ids = product_list_to_field(product_ids)
                order.total = total
            
            # --- THÊM KHỐI NÀY ---
            if "status" in data:
                order.status = data["status"]
            # ---------------------
                
            session.commit()
            return jsonify({"message": "Order updated"}), 200

    except ValueError:
        return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/orders/<int:id>", methods=["DELETE"])
def delete_order(id):
    session = Session()
    try:
        order = session.query(Order).filter(Order.id == id).first()
        if not order:
            return jsonify({"error": "Order not found"}), 404
        session.delete(order)
        session.commit()
        return jsonify({"message": "Order deleted"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

if __name__ == "__main__":
    # debug True OK for dev; in prod use gunicorn/uwsgi
    app.run(host="0.0.0.0", port=ORDERS_PORT, debug=True)