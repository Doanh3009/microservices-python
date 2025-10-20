from flask import Flask, request, jsonify
import requests
from sqlalchemy import create_engine, Column, Integer, Float, String
from sqlalchemy.orm import declarative_base, sessionmaker
import os

app = Flask(__name__)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "foodfast")

engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}")
Base = declarative_base()

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer)
    amount = Column(Float)
    status = Column(String(50))

Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

@app.route("/pay", methods=["POST"])
def make_payment():
    data = request.json
    order_resp = requests.get(f"http://orders:5003/orders/{data['order_id']}")

    if order_resp.status_code != 200:
        return jsonify({"error": "Order not found"}), 400

    order_data = order_resp.json()
    new_payment = Payment(order_id=data["order_id"], amount=order_data["total"], status="success")
    session.add(new_payment)
    session.commit()

    return jsonify({"message": "Payment successful", "payment_id": new_payment.id, "amount": order_data["total"]}), 201

@app.route("/pay", methods=["GET"])
def list_payments():
    payments = session.query(Payment).all()
    return jsonify([{"id": p.id, "order_id": p.order_id, "amount": p.amount, "status": p.status} for p in payments])

@app.route("/pay/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):
    payment = session.query(Payment).filter_by(id=payment_id).first()
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify({"id": payment.id, "order_id": payment.order_id, "amount": payment.amount, "status": payment.status})

@app.route("/pay/<int:payment_id>", methods=["DELETE"])
def delete_payment(payment_id):
    payment = session.query(Payment).filter_by(id=payment_id).first()
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    session.delete(payment)
    session.commit()
    return jsonify({"message": "Payment deleted"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004)
