import requests

# 1. Tạo user
r = requests.post("http://127.0.0.1:5001/users", json={"name": "Doanh", "email": "doanh@gmail.com"})
print("User:", r.json())

# 2. Tạo product
r = requests.post("http://127.0.0.1:5002/products", json={"name": "Laptop", "price": 1500})
print("Product:", r.json())

# 3. Tạo order
r = requests.post("http://127.0.0.1:5003/orders", json={"user_id": 1, "product_id": 1})
print("Order:", r.json())

# 4. Thanh toán
r = requests.post("http://127.0.0.1:5004/pay", json={"order_id": 1})
print("Payment:", r.json())
