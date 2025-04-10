Here's an updated and properly explained version of the **Skoegle Payment Integration API** README:

---

# 💳 **Skoegle Payment Integration API Documentation**

This document outlines how to integrate the **Skoegle Payment API** into your application. It provides details for both **demo** and **main** payment processes.

---

## 🔹 **Demo Payment**

The **Demo Payment** API is designed to test the payment flow without performing actual transactions. You can use it for testing the user interface (UI) and ensuring your integration works correctly before switching to the main payment gateway.

**API Endpoint**:
- **Live URL**: `https://payments.skoegle.com/demo-payment`
- **Local URL**: `http://localhost:5000/demo-payment`

### Query Parameters:
- **`amount`**: The payment amount (required).
- **`email`**: The user's email address (required).
- **`name`**: The full name of the user (required).
- **`redirectingurl`**: The URL to redirect the user to after the payment process (required).

### Example Request:

```plaintext
https://payments.skoegle.com/demo-payment?name=Manoj&email=manoj@gmail.com&amount=50&redirectingurl=https://skoegle.com
```

---

## 🔹 **Main Payment**

The **Main Payment** API integrates the actual payment gateway. This should be used for live transactions.

**API Endpoint**:
- **Live URL**: `https://payments.skoegle.com`
- **Local URL**: `http://localhost:5000`

### Query Parameters:
- **`amount`**: The payment amount (required).
- **`email`**: The user's email address (required).
- **`name`**: The full name of the user (required).
- **`redirectingurl`**: The URL to redirect the user to after completing the payment (required).

### Example Request:

```plaintext
https://payments.skoegle.com?name=Manoj&email=manoj@gmail.com&amount=50&redirectingurl=https://skoegle.com
```

---

## 🔹 **Redirect URL After Payment**

Once the payment has been successfully processed, the user will be redirected to the URL specified in the `redirectingurl` parameter. The URL will include the following payment details as query parameters:
- **`orderId`**: A unique identifier for the order (required).
- **`name`**: The full name of the user (required).
- **`amount`**: The payment amount (required).
- **`status`**: The payment status (e.g., `CHARGED`, `FAILED`, etc.) (required).

### Example of Redirect URL:

```plaintext
https://skoegle.in/?orderId=order_1744268526856&name=Manoj&amount=50&status=CHARGED
```

---

## 🔹 **Download Receipt**

After a successful payment, users can download their payment receipt using the `/downloadReceipt/:orderId` endpoint. Simply replace `:orderId` with the actual order ID for the transaction.

**API Endpoint**:
- **Live URL**: `https://payments.skoegle.com/downloadReceipt/:orderId`
- **Local URL**: `http://localhost:5000/downloadReceipt/:orderId`

### Example Request:

```plaintext
https://payments.skoegle.com/downloadReceipt/order_1744268526856
```

This will allow the user to download the receipt for the order with the specified `orderId`.

---

## 🔗 **GitHub Repository**

The source code for the Skoegle Payment API is available on GitHub. You can view the repository and contribute here:

[GitHub Link](https://github.com/Skoegle-Tech/Payments.git)

---

## 🛠 **Maintained By**

- **Manoj Gowda**

---

This updated README should now be clear and easy to follow for developers integrating the Skoegle Payment API into their systems. If you need any additional features or changes, feel free to let me know!
