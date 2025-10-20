
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker

# Users
engine_u = create_engine("sqlite:///users.db")
BaseU = declarative_base()
class User(BaseU):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
BaseU.metadata.create_all(engine_u)
SessionU = sessionmaker(bind=engine_u)
s_u = SessionU()

users = [
    {"name":"Alice","email":"alice@gmail.com"},
    {"name":"Bob","email":"bob@gmail.com"},
    {"name":"Charlie","email":"charlie@gmail.com"},
    {"name":"David","email":"david@gmail.com"},
    {"name":"Eve","email":"eve@gmail.com"}
]

for u in users:
    s_u.add(User(name=u['name'], email=u['email']))
s_u.commit()

# Products
engine_p = create_engine("sqlite:///products.db")
BaseP = declarative_base()
class Product(BaseP):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    price = Column(Float)
BaseP.metadata.create_all(engine_p)
SessionP = sessionmaker(bind=engine_p)
s_p = SessionP()

products = [
    {"name":"iPhone 15","price":1200},
    {"name":"AirPods Pro","price":250},
    {"name":"MacBook Air M3","price":1500},
    {"name":"Apple Watch Ultra","price":900},
    {"name":"Magic Keyboard","price":99}
]

for p in products:
    s_p.add(Product(name=p['name'], price=p['price']))
s_p.commit()

# Orders - note: order ids will be auto assigned
engine_o = create_engine("sqlite:///orders.db")
BaseO = declarative_base()
class Order(BaseO):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    product_id = Column(Integer)
    total = Column(Float)
BaseO.metadata.create_all(engine_o)
SessionO = sessionmaker(bind=engine_o)
s_o = SessionO()

orders = [
    {"user_id":1,"product_id":1,"total":1200},
    {"user_id":2,"product_id":2,"total":250},
    {"user_id":3,"product_id":3,"total":1500}
]

for o in orders:
    s_o.add(Order(user_id=o['user_id'], product_id=o['product_id'], total=o['total']))
s_o.commit()

# Payments
engine_pay = create_engine("sqlite:///payments.db")
BasePay = declarative_base()
class Payment(BasePay):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer)
    amount = Column(Float)
    status = Column(String)
BasePay.metadata.create_all(engine_pay)
SessionPay = sessionmaker(bind=engine_pay)
s_pay = SessionPay()

payments = [
    {"order_id":1,"amount":1200,"status":"completed"},
    {"order_id":2,"amount":250,"status":"pending"},
    {"order_id":3,"amount":1500,"status":"failed"}
]

for p in payments:
    s_pay.add(Payment(order_id=p['order_id'], amount=p['amount'], status=p['status']))
s_pay.commit()

print("Databases seeded: users.db, products.db, orders.db, payments.db")
