


```# Skoegle Payment Integration
# 💳 Skoegle Payment API Documentation

This document explains how to use the **Skoegle Payment Integration APIs** for both **demo** and **main** payments.

## 🔹 Demo Payment

Use this for testing the payment UI flow without actual transactions.

**URL:**
- Live: `https://payments.skoegle.com/demo-payment`
- Local: `http://localhost:5000/demo-payment`

### Query Parameters:
- `amount` – Payment amount (required)
- `email` – User email (required)
- `name` – Full name (required)
- `redirectingurl` – URL to redirect after payment (required)

**Example:**

```
https://payments.skoegle.com/demo-payment?name=Manoj&email=manoj@gmail.com&amount=50&redirectingurl=https://skoegle.com
```

---

## 🔹 Main Payment

This is the actual payment gateway integration.

**URL:**
- Live: `https://payments.skoegle.com`
- Local: `http://localhost:5000`

### Query Parameters:
- `amount` – Payment amount (required)
- `email` – User email (required)
- `name` – Full name (required)
- `redirectingurl` – URL to redirect after payment (required)

**Example:**

```
https://payments.skoegle.com?name=Manoj&email=manoj@gmail.com&amount=50&redirectingurl=https://skoegle.com
```

---

## 🔹 Redirect URL After Payment

Once the payment is successfully completed, the user will be redirected to the URL specified in the `redirectingurl` parameter. The URL will include the payment details such as `orderId`, `name`, `amount`, and `status`.

**Example of Redirect URL:**

```
https://skoegle.in/?orderId=order_1744268526856&name=Manoj&amount=50&status=CHARGED
```

### Parameters:
- `orderId` – The unique order identifier (required)
- `name` – Full name (required)
- `amount` – Payment amount (required)
- `status` – Payment status, e.g., `CHARGED` (required)

---

## 🔹 Download Receipt

After completing the payment, you can download the receipt by accessing the `/downloadReceipt/:orderId` endpoint. Replace `:orderId` with the actual order ID you wish to download the receipt for.

**URL:**
- Live: `https://payments.skoegle.com/downloadReceipt/:orderId`
- Local: `http://localhost:5000/downloadReceipt/:orderId`

**Example:**

```
https://payments.skoegle.com/downloadReceipt/order_1744268526856
```

This will allow the user to download the receipt for the order with ID `order_1744268526856`.

---

## 🔗 GitHub Repository

Visit the source code here:

[GitHub Link](https://github.com/Skoegle-Tech/Payments.git)

---

## 🛠 Maintained By

- **Manoj Gowda**
