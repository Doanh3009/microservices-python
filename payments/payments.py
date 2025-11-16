from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, Float, String, text, exc
from sqlalchemy.orm import declarative_base, sessionmaker
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
import time

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("PAYMENTS_DB") # Đọc PAYMENTS_DB

# === LOGIC TỰ TẠO DATABASE ===
def init_db():
    master_engine = create_engine(
        f"mssql+pymssql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/master",
        isolation_level="AUTOCOMMIT"
    )
    
    try:
        with master_engine.connect() as conn:
            conn.execute(text(f"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{DB_NAME}') CREATE DATABASE [{DB_NAME}]"))
        print(f"Database '{DB_NAME}' is ready.")
    except exc.SQLAlchemyError as e:
        print(f"Error creating database: {e}")
        time.sleep(5)
        init_db()
    finally:
        master_engine.dispose()

    db_engine = create_engine(f"mssql+pymssql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    return db_engine
# ===============================

engine = init_db()
Base = declarative_base()
Session = sessionmaker(bind=engine)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer)
    amount = Column(Float)
    method = Column(String(50))
    status = Column(String(50))

Base.metadata.create_all(engine)

def get_order_total(order_id):
    """Fetch order total from Orders service"""
    try:
        # Sửa: Dùng tên service 'orders' thay vì 'localhost'
        response = requests.get(f"http://orders:5003/orders/{order_id}")
        if response.status_code == 200:
            order = response.json()
            return order.get('total', 0)
        return 0
    except:
        return 0

@app.route("/payments", methods=["POST"])
def make_payment():
    session = Session()
    try:
        data = request.json
        order_id = int(data["order_id"])
        method = data["method"]
        status = data.get("status", "Pending")
        
        if order_id <= 0:
            return jsonify({"error": "Order ID must be positive"}), 400
        
        if not method:
            return jsonify({"error": "Payment method is required"}), 400
        
        # Get amount from order
        amount = get_order_total(order_id)
        if amount <= 0:
            return jsonify({"error": "Invalid order or order total is 0"}), 400
        
        custom_id = data.get("id")
        
        if custom_id:
            custom_id = int(custom_id)
            if custom_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
                
            existing = session.query(Payment).filter(Payment.id == custom_id).first()
            if existing:
                return jsonify({"error": "ID already exists"}), 409
            
            try:
                session.execute(text("SET IDENTITY_INSERT payments ON"))
                payment = Payment(id=custom_id, order_id=order_id, amount=amount, method=method, status=status)
                session.add(payment)
                session.commit()
                session.execute(text("SET IDENTITY_INSERT payments OFF"))
                session.commit()
                return jsonify({
                    "message": "Payment created with custom ID",
                    "id": payment.id,
                    "amount": amount,
                    "status": status
                }), 201
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT payments OFF"))
                session.commit()
                raise e
        else:
            payment = Payment(order_id=order_id, amount=amount, method=method, status=status)
            session.add(payment)
            session.commit()
            return jsonify({
                "message": "Payment created",
                "id": payment.id,
                "amount": amount,
                "status": status
            }), 201
            
    except ValueError:
        return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/payments", methods=["GET"])
def list_payments():
    session = Session()
    try:
        search = request.args.get('search', '').strip()
        query = session.query(Payment)
        
        if search:
            try:
                search_id = int(search)
                query = query.filter((Payment.id == search_id) | (Payment.order_id == search_id))
            except ValueError:
                query = query.filter(
                    (Payment.method.like(f"%{search}%")) | 
                    (Payment.status.like(f"%{search}%"))
                )
        
        payments = query.all()
        return jsonify([{
            "id": p.id,
            "order_id": p.order_id,
            "amount": p.amount,
            "method": p.method,
            "status": p.status
        } for p in payments])
    finally:
        session.close()

@app.route("/payments/<int:id>", methods=["PUT"])
def update_payment(id):
    session = Session()
    try:
        data = request.json
        payment = session.query(Payment).filter(Payment.id == id).first()
        
        if not payment:
            return jsonify({"error": "Payment not found"}), 404
        
        new_id = data.get("id")
        
        if new_id and int(new_id) != id:
            new_id = int(new_id)
            if new_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
                
            existing = session.query(Payment).filter(Payment.id == new_id).first()
            if existing:
                return jsonify({"error": "New ID already exists"}), 409
            
            old_order_id = payment.order_id
            old_amount = payment.amount
            old_method = payment.method
            old_status = payment.status
            
            session.delete(payment)
            session.commit()
            
            try:
                session.execute(text("SET IDENTITY_INSERT payments ON"))
                new_payment = Payment(
                    id=new_id,
                    order_id=data.get("order_id", old_order_id),
                    amount=data.get("amount", old_amount),
                    method=data.get("method", old_method),
                    status=data.get("status", old_status)
                )
                session.add(new_payment)
                session.commit()
                session.execute(text("SET IDENTITY_INSERT payments OFF"))
                session.commit()
                return jsonify({"message": "Payment updated with new ID", "new_id": new_id}), 200
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT payments OFF"))
                session.commit()
                raise e
        else:
            payment.order_id = data.get("order_id", payment.order_id)
            payment.amount = data.get("amount", payment.amount)
            payment.method = data.get("method", payment.method)
            payment.status = data.get("status", payment.status)
            session.commit()
            return jsonify({"message": "Payment updated"}), 200
            
    except ValueError:
        return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/payments/<int:id>", methods=["DELETE"])
def delete_payment(id):
    session = Session()
    try:
        payment = session.query(Payment).filter(Payment.id == id).first()
        if not payment:
            return jsonify({"error": "Payment not found"}), 404
        session.delete(payment)
        session.commit()
        return jsonify({"message": "Payment deleted"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PAYMENTS_PORT", 5004)), debug=True)