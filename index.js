const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('1234567890abcdef'); 
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const { Juspay } = require('expresscheckout-nodejs');
require('dotenv').config();
const CURRENT_DATE = new Date().toLocaleString();
const CURRENT_USER = 'Skoegle HDFC';
const unmaper = require('unmaper');
const basicAuth = require('basic-auth');
const publicKey = fs.readFileSync("./Pem/key_10181d5020444b84980d9278511b72e3.pem");
const privateKey = fs.readFileSync("./Pem/privateKey.pem");
Juspay.customLogger = Juspay.silentLogger;
const moment = require('moment');
// Initialize Juspay
const juspay = new Juspay({
  merchantId: process.env.MERCHANT_ID,
  baseUrl: process.env.PAYMENT_URL,
  jweAuth: {
    keyId: process.env.KEY_UUID,
    publicKey,
    privateKey
  }
});

// Initialize app
const app = express();
const port = process.env.PORT || 5000;
app.get("/ping",unmaper)
app.use(cors());
// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Model
const PaymentLog = mongoose.model('PaymentLog', new mongoose.Schema({
  orderId: String,
  name: String,
  email: String,
  amount: Number,
  status: { type: String, default: 'INITIATED' },
  response: Object,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  user: { type: String, default: CURRENT_USER },
  redirectingurl: String
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
const authMiddleware = (req, res, next) => {
  
  const user = basicAuth(req);
  const isAuthorized = user && user.name === 'admin' && user.pass === 'Skoegle@2025';

  if (!isAuthorized) {
    res.set('WWW-Authenticate', 'Basic realm="Secure Area"');
    return res.status(401).send('Authentication required.');
  }
  next();
};
// Current date and user info middleware
app.use((req, res, next) => {
  res.locals.currentDate = CURRENT_DATE;
  res.locals.currentUser = CURRENT_USER;
  next();
});

// Routes
app.get('/pay', (req, res) => {
  const { name, email, amount, redirectingurl } = req.query;



  if (name && email && amount) {
    const orderId = `order_${Date.now()}`;
    const encryptedAmount = cryptr.decrypt(amount);
    console.log(`Encrypted Amount: ${encryptedAmount}`);
    const finalAmount = parseInt(encryptedAmount);
    
    // Properly handle redirectingurl
    let returnUrl = `https://${req.get('host')}/handleJuspayResponse`;
    if (redirectingurl && redirectingurl.trim() !== '') {
      returnUrl += `?redirectingurl=${encodeURIComponent(redirectingurl)}`;
    }
    
    console.log(`Creating payment session with return URL: ${returnUrl}`);

    juspay.orderSession.create({
      order_id: orderId,
      amount: finalAmount,
      payment_page_client_id: process.env.PAYMENT_PAGE_CLIENT_ID,
      customer_id: email || 'guest-user',
      action: 'paymentPage',
      return_url: returnUrl,
      currency: 'INR'
    }).then(session => {
      PaymentLog.create({
        orderId,
        name,
        email,
        amount: finalAmount,
        response: session,
        user: CURRENT_USER,
        redirectingurl: redirectingurl
      }).then(() => {
        console.log(`Payment initiated via GET: OrderID ${orderId}, Amount: ₹${finalAmount}`);
        res.redirect(session.payment_links.web);
      }).catch(err => {
        console.error('Error creating payment log:', err);
        res.status(500).send('Payment initiation failed');
      });
    }).catch(err => {
      console.error('Juspay session creation error:', err);
      res.status(500).send('Payment initiation failed');
    });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'payment.html'));
  }
});

app.get("/createPayment", (req, res) => {
  const { amount, key, type } = req.query;

  if (!key) {
    return res.status(400).json({ success: false, message: 'Missing key' });
  }

  if (key !== '1234567890abcdef') {
    return res.status(403).json({ success: false, message: 'Invalid key' });
  }

  if (type === 'encrypt') {
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Missing amount to encrypt' });
    }

    // Convert amount to integer before encryption
    const intAmount = parseInt(amount);
    if (isNaN(intAmount)) {
      return res.status(400).json({ success: false, message: 'Amount must be a valid number' });
    }

    const encryptedAmount = cryptr.encrypt(intAmount.toString()); // encrypt as string
    console.log(`Encrypted Amount: ${encryptedAmount}`);

    return res.json({
      success: true,
      type: 'encrypt',
      encryptedAmount,
    });

  } else if (type === 'decrypt' || !type) {
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Missing encrypted amount to decrypt' });
    }

    try {
      const decryptedAmountStr = cryptr.decrypt(amount);
      const decryptedAmount = parseInt(decryptedAmountStr);

      if (isNaN(decryptedAmount)) {
        return res.status(400).json({ success: false, message: 'Decrypted value is not a valid number' });
      }

      console.log(`Decrypted Amount (as integer): ${decryptedAmount}`);

      return res.json({
        success: true,
        type: 'decrypt',
        decryptedAmount,
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Decryption failed. Invalid encrypted text.' });
    }

  } else {
    return res.status(400).json({ success: false, message: 'Invalid type. Use encrypt or decrypt.' });
  }
});



app.get('/handleJuspayResponse', async (req, res) => {
  const orderId = req.query.order_id || req.query.orderId;
  let redirectingurl = req.query.redirectingurl || '';
  
  console.log('handleJuspayResponse received:');
  console.log('- OrderID:', orderId);
  console.log('- RedirectURL from query:', redirectingurl);

  if (!orderId) {
    return res.status(400).send('Missing order_id');
  }

  try {
    // Get payment status from Juspay
    const statusResponse = await juspay.order.status(orderId);
    console.log(`Payment status received for ${orderId}: ${statusResponse.status}`);

    // Get payment log
    const paymentLog = await PaymentLog.findOne({ orderId });
    
    // Check if redirectingurl is in database but not in query params
    if (paymentLog && paymentLog.redirectingurl && (!redirectingurl || redirectingurl === '')) {
      redirectingurl = paymentLog.redirectingurl;
      console.log('- RedirectURL from database:', redirectingurl);
    }

    // Update payment log in database
    await PaymentLog.findOneAndUpdate(
      { orderId },
      {
        status: statusResponse.status,
        response: statusResponse,
        updatedAt: new Date()
      }
    );

    // If payment log not found, create a default one for demo
    const paymentData = paymentLog || {
      orderId,
      name: req.query.name || 'Demo User',
      email: req.query.email || 'user@example.com',
      amount: parseFloat(req.query.amount) || 100.00,
      status: statusResponse.status,
      createdAt: new Date(),
      user: CURRENT_USER,
      redirectingurl: redirectingurl
    };

    // Redirect to response page with parameters
    const redirectParams = new URLSearchParams();
    redirectParams.append('orderId', paymentData.orderId);
    redirectParams.append('name', paymentData.name);
    redirectParams.append('email', paymentData.email);
    redirectParams.append('amount', paymentData.amount);
    redirectParams.append('status', statusResponse.status);
    redirectParams.append('timestamp', CURRENT_DATE);
    redirectParams.append('user', CURRENT_USER);
    
    // Properly handle redirectingurl
    if (redirectingurl && redirectingurl.trim() !== '') {
      redirectParams.append('redirectingurl', encodeURIComponent(redirectingurl));
      console.log('- Added redirectingurl to params:', redirectingurl);
    }

    const redirectUrl = `/response.html?${redirectParams.toString()}`;
    console.log('- Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error processing Juspay response:', err);
    
    // Create error response with available data
    const redirectParams = new URLSearchParams();
    redirectParams.append('orderId', orderId);
    redirectParams.append('status', 'ERROR');
    redirectParams.append('errorMessage', err.message);
    redirectParams.append('timestamp', CURRENT_DATE);
    redirectParams.append('user', CURRENT_USER);
    
    // Properly handle redirectingurl in error case too
    if (redirectingurl && redirectingurl.trim() !== '') {
      redirectParams.append('redirectingurl', encodeURIComponent(redirectingurl));
    }
    
    res.redirect(`/response.html?${redirectParams.toString()}`);
  }
});

// Handle POST requests from Juspay callback
app.post('/handleJuspayResponse', async (req, res) => {
  const orderId = req.body.order_id || req.body.orderId;
  let redirectingurl = req.query.redirectingurl || '';
  
  console.log('POST handleJuspayResponse received:');
  console.log('- OrderID:', orderId);
  console.log('- RedirectURL from query:', redirectingurl);

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Missing order_id' });
  }

  try {
    // Get payment status from Juspay
    const statusResponse = await juspay.order.status(orderId);
    console.log(`Payment status received for ${orderId}: ${statusResponse.status}`);

    // Get payment log
    const paymentLog = await PaymentLog.findOne({ orderId });
    
    // Check if redirectingurl is in database but not in query params
    if (paymentLog && paymentLog.redirectingurl && (!redirectingurl || redirectingurl === '')) {
      redirectingurl = paymentLog.redirectingurl;
      console.log('- RedirectURL from database:', redirectingurl);
    }

    // Update payment log in database
    await PaymentLog.findOneAndUpdate(
      { orderId },
      {
        status: statusResponse.status,
        response: statusResponse,
        updatedAt: new Date()
      }
    );

    // If payment log not found, create a default one for demo
    const paymentData = paymentLog || {
      orderId,
      name: req.body.name || 'Demo User',
      email: req.body.email || 'user@example.com',
      amount: parseFloat(req.body.amount) || 100.00,
      status: statusResponse.status,
      createdAt: new Date(),
      user: CURRENT_USER,
      redirectingurl: redirectingurl
    };

    // Handle different response formats based on the request
    if (req.headers['content-type']?.includes('application/json')) {
      // If it's an API call, return JSON
      res.json({
        success: statusResponse.status === 'CHARGED',
        orderId: paymentData.orderId,
        name: paymentData.name,
        email: paymentData.email,
        amount: paymentData.amount,
        status: statusResponse.status,
        timestamp: CURRENT_DATE,
        redirectingurl: redirectingurl
      });
    } else {
      // Otherwise redirect to the response page
      const redirectParams = new URLSearchParams();
      redirectParams.append('orderId', paymentData.orderId);
      redirectParams.append('name', paymentData.name);
      redirectParams.append('email', paymentData.email);
      redirectParams.append('amount', paymentData.amount);
      redirectParams.append('status', statusResponse.status);
      redirectParams.append('timestamp', CURRENT_DATE);
      redirectParams.append('user', CURRENT_USER);
      
      // Properly handle redirectingurl
      if (redirectingurl && redirectingurl.trim() !== '') {
        redirectParams.append('redirectingurl', encodeURIComponent(redirectingurl));
        console.log('- Added redirectingurl to params:', redirectingurl);
      }
      
      const redirectUrl = `/response.html?${redirectParams.toString()}`;
      console.log('- Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    }
  } catch (err) {
    console.error('Error processing Juspay response:', err);
    
    if (req.headers['content-type']?.includes('application/json')) {
      res.status(500).json({
        success: false,
        error: err.message,
        orderId: orderId
      });
    } else {
      // Create error response with available data
      const redirectParams = new URLSearchParams();
      redirectParams.append('orderId', orderId);
      redirectParams.append('status', 'ERROR');
      redirectParams.append('errorMessage', err.message);
      redirectParams.append('timestamp', CURRENT_DATE);
      redirectParams.append('user', CURRENT_USER);
      
      // Properly handle redirectingurl in error case too
      if (redirectingurl && redirectingurl.trim() !== '') {
        redirectParams.append('redirectingurl', encodeURIComponent(redirectingurl));
      }
      
      res.redirect(`/response.html?${redirectParams.toString()}`);
    }
  }
});

// Receipt download
app.get('/downloadReceipt/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    // Try to find payment log in database
    let paymentLog = await PaymentLog.findOne({ orderId });
    
    // If not found, create demo receipt for testing
    if (!paymentLog) {
      paymentLog = {
        orderId: orderId,
        name: req.query.name || 'Demo User',
        email: req.query.email || 'user@example.com',
        amount: parseFloat(req.query.amount) || 100.00,
        status: req.query.status || 'CHARGED',
        createdAt: new Date(),
        user: CURRENT_USER
      };
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });
    
    const filename = `receipt_${orderId}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Add styled receipt
    // Add title
    doc.font('Helvetica-Bold').fontSize(24).text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    
    // Add a styled line
    doc.strokeColor('#3a7bd5')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    doc.moveDown();

    // Add receipt details in a box
    doc.rect(50, doc.y, 500, 200).lineWidth(1).stroke();
    const startY = doc.y + 10;

    // Add receipt info
    doc.font('Helvetica-Bold').fontSize(12).text('Receipt Details:', 70, startY);
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Order ID: ${paymentLog.orderId}`, 70);
    doc.moveDown(0.5);
    doc.text(`Customer Name: ${paymentLog.name}`, 70);
    doc.moveDown(0.5);
    doc.text(`Email: ${paymentLog.email}`, 70);
    doc.moveDown(0.5);
    doc.text(`Amount: ₹${parseFloat(paymentLog.amount).toFixed(2)}`, 70);
    doc.moveDown(0.5);
    doc.text(`Status: ${paymentLog.status}`, 70);
    doc.moveDown(0.5);
    doc.text(`Date: ${new Date(paymentLog.createdAt).toLocaleString()}`, 70);
    doc.moveDown(0.5);
    doc.text(`Generated On: ${CURRENT_DATE}`, 70);
    doc.moveDown(0.5);
    doc.text(`Generated By: ${paymentLog.user || CURRENT_USER}`, 70);
    
    // Add a thank you message
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Thank you for your payment!', { align: 'center' });
    
    // Add footer with company info
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text('Payment processed via HDFC Bank Payment Gateway', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(8).text('This is an electronically generated receipt and does not require a signature.', { align: 'center' });
    doc.moveDown(0.5);
    doc.text(`Generated on: ${CURRENT_DATE}`, { align: 'center' });
    
    doc.end();
  } catch (err) {
    console.error('Error generating receipt:', err);
    res.status(500).send('Error generating receipt. Please try again later.');
  }
});

// Special route for testing the payment flow
app.get('/demo-payment', (req, res) => {
  const { name, email, amount, redirectingurl, status } = req.query;
  const orderId = `order_demo_${Date.now()}`;
  
  console.log('Demo payment requested:');
  console.log('- Name:', name || 'Demo User');
  console.log('- Email:', email || 'user@example.com');
  console.log('- Amount:', amount || '100');
  console.log('- RedirectURL:', redirectingurl || 'None');
  
  // Create URL params for response page
  const redirectParams = new URLSearchParams();
  redirectParams.append('orderId', orderId);
  redirectParams.append('name', name || 'Demo User');
  redirectParams.append('email', email || 'user@example.com');
  redirectParams.append('amount', amount || '100');
  redirectParams.append('status', status || 'CHARGED');
  redirectParams.append('timestamp', CURRENT_DATE);
  redirectParams.append('user', CURRENT_USER);
  
  // Properly handle redirectingurl
  if (redirectingurl && redirectingurl.trim() !== '') {
    redirectParams.append('redirectingurl', encodeURIComponent(redirectingurl));
    console.log('- Added redirectingurl to params:', redirectingurl);
  }
  
  // Log demo payment
  console.log(`Demo payment created: OrderID ${orderId}, Amount: ₹${amount || '100'}, Status: ${status || 'CHARGED'}`);
  
  // Redirect to response page
  const redirectUrl = `/response.html?${redirectParams.toString()}`;
  console.log('- Redirecting to:', redirectUrl);
  res.redirect(redirectUrl);
});

// API endpoint to check payment status
app.get('/api/paymentStatus/:orderId', async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const paymentLog = await PaymentLog.findOne({ orderId });
    if (!paymentLog) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Get latest status from Juspay
    const statusResponse = await juspay.order.status(orderId);
    
    // Update status in database if it has changed
    if (statusResponse.status !== paymentLog.status) {
      await PaymentLog.findOneAndUpdate(
        { orderId },
        {
          status: statusResponse.status,
          response: statusResponse,
          updatedAt: new Date()
        }
      );
    }
    
    res.json({
      success: true,
      orderId: paymentLog.orderId,
      status: statusResponse.status,
      amount: paymentLog.amount,
      name: paymentLog.name,
      email: paymentLog.email,
      createdAt: paymentLog.createdAt,
      timestamp: CURRENT_DATE,
      redirectingurl: paymentLog.redirectingurl
    });
  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ success: false, message: 'Error fetching payment status' });
  }
});




app.get('/', authMiddleware, async (req, res) => {
  try {
    let { start, end } = req.query;

    // Default: last 7 days
    const startDate = start ? new Date(start) : moment().subtract(7, 'days').toDate();
    const endDate = end ? new Date(end) : new Date();

    const payments = await PaymentLog.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ createdAt: -1 }).limit(100);

    if (req.headers.accept === 'application/json') {
      return res.json({
        success: true,
        count: payments.length,
        payments
      });
    }

    const CURRENT_DATE = new Date().toLocaleString();
    const CURRENT_USER = 'admin';

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Logs</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          body { padding: 20px; }
          .truncate {
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          #searchInput {
            width: 300px;
          }
        </style>
      </head>
      <body>
        <div class="top-bar mb-3">
          <h1>Payment Logs</h1>
          
        </div>
        
        <form method="GET" class="mb-4">
          <label>Start Date: <input type="date" name="start" value="${start || ''}"></label>
          <label class="ms-3">End Date: <input type="date" name="end" value="${end || ''}"></label>
          <button type="submit" class="btn btn-sm btn-dark ms-2">Filter</button>
        </form>

        <div class="mb-3">
          <input type="text" id="searchInput" class="form-control" placeholder="Search by Order ID, Name, Email, Amount, or Status">
        </div>

        <p>Current Date: ${CURRENT_DATE}</p>
        <p>Current User: ${CURRENT_USER}</p>

        <table class="table table-striped" id="paymentTable">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Redirect URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    payments.forEach(payment => {
      html += `
        <tr>
          <td>${payment.orderId}</td>
          <td>${payment.name}</td>
          <td>${payment.email}</td>
          <td>₹${payment.amount.toFixed(2)}</td>
          <td>
            <span class="badge bg-${payment.status === 'CHARGED' ? 'success' : payment.status === 'FAILED' ? 'danger' : 'warning'}">
              ${payment.status}
            </span>
          </td>
          <td>${new Date(payment.createdAt).toLocaleString()}</td>
          <td class="truncate" title="${payment.redirectingurl || ''}">
            ${payment.redirectingurl || '-'}
          </td>
          <td>
            <a href="/downloadReceipt/${payment.orderId}" class="btn btn-sm btn-primary">Download Receipt</a>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>

        <script>
          const searchInput = document.getElementById('searchInput');
          searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#paymentTable tbody tr');
            rows.forEach(row => {
              const text = row.innerText.toLowerCase();
              row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
          });
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error('Error fetching payment logs:', err);
    res.status(500).send('Error fetching payment logs');
  }
});


app.use((req, res) => {
  if (req.headers.accept === 'application/json') {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  }
  
  res.status(404).send(`
    <html>
      <head>
        <title>Page Not Found</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light d-flex align-items-center justify-content-center" style="height: 100vh;">
        <div class="card shadow-sm" style="max-width: 500px;">
          <div class="card-header bg-warning">
            <h3>Page Not Found</h3>
          </div>
          <div class="card-body">
            <p>Sorry, the page you are looking for does not exist.</p>
            <a href="/" class="btn btn-primary">Return to Home</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`🔒 Payment system initialized for ${process.env.MERCHANT_ID}`);
  console.log(`📅 Server started at: ${CURRENT_DATE}`);
  console.log(`👤 Current user: ${CURRENT_USER}`);
});
