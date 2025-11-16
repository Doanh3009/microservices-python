from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, String, Float, text, exc
from sqlalchemy.orm import declarative_base, sessionmaker
from flask_cors import CORS
from dotenv import load_dotenv
import os
import time

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("PRODUCTS_DB") # Đọc PRODUCTS_DB

# === LOGIC TỰ TẠO DATABASE ===
def init_db():
    master_engine = create_engine(
        f"mssql+pymssql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/master",
        isolation_level="AUTOCOMMIT"
    )
    
    # SỬA: Tăng số lần thử lên 15
    retries = 50
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

    db_engine = create_engine(f"mssql+pymssql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    return db_engine
# ===============================

engine = init_db()
Base = declarative_base()
Session = sessionmaker(bind=engine)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100))
    price = Column(Float)

Base.metadata.create_all(engine)

# SỬA: Thêm dấu /
@app.route("/products/", methods=["POST"])
def create_product():
    session = Session()
    try:
        data = request.json
        
        # Validate price
        price = float(data.get("price", 0))
        if price <= 0:
            return jsonify({"error": "Price must be greater than 0"}), 400
        
        custom_id = data.get("id")
        
        # If custom ID provided
        if custom_id:
            custom_id = int(custom_id)
            if custom_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
                
            existing = session.query(Product).filter(Product.id == custom_id).first()
            if existing:
                return jsonify({"error": "ID already exists"}), 409
            
            try:
                session.execute(text("SET IDENTITY_INSERT products ON"))
                product = Product(id=custom_id, name=data["name"], price=price)
                session.add(product)
                session.commit()
                session.execute(text("SET IDENTITY_INSERT products OFF"))
                session.commit()
                return jsonify({"message": "Product created with custom ID", "id": product.id}), 201
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT products OFF"))
                session.commit()
                raise e
        else:
            product = Product(name=data["name"], price=price)
            session.add(product)
            session.commit()
            return jsonify({"message": "Product created", "id": product.id}), 201
            
    except ValueError:
        return jsonify({"error": "Invalid price format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# SỬA: Thêm dấu /
@app.route("/products/", methods=["GET"])
def list_products():
    session = Session()
    try:
        search = request.args.get('search', '').strip()
        query = session.query(Product)
        
        if search:
            query = query.filter(Product.name.like(f"%{search}%"))
        
        products = query.all()
        return jsonify([{"id": p.id, "name": p.name, "price": p.price} for p in products])
    finally:
        session.close()

# SỬA: Thêm dấu /
@app.route("/products/<int:id>/", methods=["PUT"])
def update_product(id):
    session = Session()
    try:
        data = request.json
        product = session.query(Product).filter(Product.id == id).first()
        
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # Validate price if provided
        if "price" in data:
            price = float(data["price"])
            if price <= 0:
                return jsonify({"error": "Price must be greater than 0"}), 400
        
        new_id = data.get("id")
        
        if new_id and int(new_id) != id:
            new_id = int(new_id)
            if new_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
                
            existing = session.query(Product).filter(Product.id == new_id).first()
            if existing:
                return jsonify({"error": "New ID already exists"}), 409
            
            old_name = product.name
            old_price = product.price
            
            session.delete(product)
            session.commit()
            
            try:
                session.execute(text("SET IDENTITY_INSERT products ON"))
                new_product = Product(
                    id=new_id,
                    name=data.get("name", old_name),
                    price=data.get("price", old_price)
                )
                session.add(new_product)
                session.commit()
                session.execute(text("SET IDENTITY_INSERT products OFF"))
                session.commit()
                return jsonify({"message": "Product updated with new ID", "new_id": new_id}), 200
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT products OFF"))
                session.commit()
                raise e
        else:
            product.name = data.get("name", product.name)
            if "price" in data:
                 product.price = data["price"] # Sửa lỗi gõ sai
            session.commit()
            return jsonify({"message": "Product updated"}), 200
            
    except ValueError:
        return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# SỬA: Thêm dấu /
@app.route("/products/<int:id>/", methods=["DELETE"])
def delete_product(id):
    session = Session()
    try:
        product = session.query(Product).filter(Product.id == id).first()
        if not product:
            return jsonify({"error": "Product not found"}), 404
        session.delete(product)
        session.commit()
        return jsonify({"message": "Product deleted"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PRODUCTS_PORT", 5002)), debug=True)