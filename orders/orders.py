from flask import Flask, request, jsonify
import requests
from sqlalchemy import create_engine, Column, Integer, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import os

app = Flask(__name__)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "foodfast")

engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}")
Base = declarative_base()

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer)
    product_id = Column(Integer)
    total = Column(Float)

Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

@app.route("/orders", methods=["POST"])
def create_order():
    data = request.json
    user_resp = requests.get(f"http://users:5001/users/{data['user_id']}")
    product_resp = requests.get(f"http://products:5002/products/{data['product_id']}")

    if user_resp.status_code != 200 or product_resp.status_code != 200:
        return jsonify({"error": "User or Product not found"}), 400

    product_data = product_resp.json()
    new_order = Order(user_id=data["user_id"], product_id=data["product_id"], total=product_data["price"])
    session.add(new_order)
    session.commit()

    return jsonify({"message": "Order created", "id": new_order.id, "total": product_data["price"]}), 201

@app.route("/orders", methods=["GET"])
def list_orders():
    orders = session.query(Order).all()
    return jsonify([{"id": o.id, "user_id": o.user_id, "product_id": o.product_id, "total": o.total} for o in orders])

@app.route("/orders/<int:order_id>", methods=["GET"])
def get_order(order_id):
    order = session.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify({"id": order.id, "user_id": order.user_id, "product_id": order.product_id, "total": order.total})

@app.route("/orders/<int:order_id>", methods=["PUT"])
def update_order(order_id):
    data = request.json
    order = session.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if "product_id" in data:
        product_resp = requests.get(f"http://products:5002/products/{data['product_id']}")
        if product_resp.status_code != 200:
            return jsonify({"error": "Product not found"}), 400
        product_data = product_resp.json()
        order.product_id = data["product_id"]
        order.total = product_data["price"]

    session.commit()
    return jsonify({"message": "Order updated"})

@app.route("/orders/<int:order_id>", methods=["DELETE"])
def delete_order(order_id):
    order = session.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    session.delete(order)
    session.commit()
    return jsonify({"message": "Order deleted"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
