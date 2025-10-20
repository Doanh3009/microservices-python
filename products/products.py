from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import os

app = Flask(__name__)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "foodfast")

engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}")
Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100))
    price = Column(Float)

Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

@app.route("/products", methods=["POST"])
def add_product():
    data = request.json
    new_product = Product(name=data["name"], price=data["price"])
    session.add(new_product)
    session.commit()
    return jsonify({"message": "Product added", "id": new_product.id}), 201

@app.route("/products", methods=["GET"])
def list_products():
    products = session.query(Product).all()
    return jsonify([{"id": p.id, "name": p.name, "price": p.price} for p in products])

@app.route("/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    product = session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"id": product.id, "name": product.name, "price": product.price})

@app.route("/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    data = request.json
    product = session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"error": "Product not found"}), 404
    product.name = data.get("name", product.name)
    product.price = data.get("price", product.price)
    session.commit()
    return jsonify({"message": "Product updated"})

@app.route("/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    product = session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"error": "Product not found"}), 404
    session.delete(product)
    session.commit()
    return jsonify({"message": "Product deleted"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
