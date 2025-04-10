document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const status = urlParams.get('status');
    const name = urlParams.get('name');
    const email = urlParams.get('email');
    const amount = urlParams.get('amount');
    const redirectingurl = urlParams.get('redirectingurl');
    
    // Set receipt details
    document.getElementById('orderId').textContent = orderId || '-';
    document.getElementById('customerName').textContent = name || '-';
    document.getElementById('customerEmail').textContent = email || '-';
    document.getElementById('paymentAmount').textContent = amount ? `₹${parseFloat(amount).toFixed(2)}` : '-';
    document.getElementById('paymentStatus').textContent = status || '-';
    document.getElementById('paymentDate').textContent = new Date().toLocaleString();
    
    // Set status UI
    const statusHeader = document.getElementById('statusHeader');
    const statusIcon = document.getElementById('statusIcon');
    const statusTitle = document.getElementById('statusTitle');
    const progressBar = document.getElementById('progressBar');
    
    if (status === 'CHARGED') {
      statusHeader.classList.add('success-header');
      statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
      statusTitle.textContent = 'Payment Successful!';
      progressBar.classList.add('bg-success');
      
      // Play success sound
      playSound('success');
    } else if (status === 'FAILED' || status === 'AUTHORIZATION_FAILED') {
      statusHeader.classList.add('failure-header');
      statusIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
      statusTitle.textContent = 'Payment Failed';
      progressBar.classList.add('bg-danger');
      
      // Play error sound
      playSound('error');
    } else {
      statusHeader.style.background = 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)';
      statusIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
      statusTitle.textContent = 'Payment Processing';
      progressBar.classList.add('bg-info');
    }
    
    // Set download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (status === 'CHARGED') {
      downloadBtn.href = `/downloadReceipt/${orderId}`;
      downloadBtn.download = `receipt_${orderId}.pdf`;
      
      // Auto-download receipt after 1 second
      setTimeout(() => {
        downloadBtn.click();
      }, 1000);
    } else {
      downloadBtn.style.display = 'none';
    }
    
    // Handle redirection
    if (redirectingurl) {
      let seconds = 10;
      const countdownElem = document.getElementById('countdown');
      const redirectMessage = document.getElementById('redirectMessage');
      
      const countdown = setInterval(() => {
        seconds--;
        countdownElem.textContent = seconds;
        progressBar.style.width = (seconds * 10) + '%';
        
        if (seconds <= 0) {
          clearInterval(countdown);
          const redirectParams = new URLSearchParams();
          redirectParams.append('orderId', orderId || '');
          redirectParams.append('name', name || '');
          redirectParams.append('amount', amount || '');
          redirectParams.append('status', status || '');
          
          window.location.href = redirectingurl + 
            (redirectingurl.includes('?') ? '&' : '?') + 
            redirectParams.toString();
        }
      }, 1000);
    } else {
      document.getElementById('redirectMessage').style.display = 'none';
      document.querySelector('.progress').style.display = 'none';
    }
    
    // Sound effects function
    function playSound(type) {
      try {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.play();
      } catch (e) {
        console.log('Sound not available');
      }
    }
    
    // Add copy orderId functionality
    const orderIdElement = document.getElementById('orderId');
    orderIdElement.style.cursor = 'pointer';
    orderIdElement.title = 'Click to copy';
    
    orderIdElement.addEventListener('click', function() {
      const textArea = document.createElement('textarea');
      textArea.value = this.textContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = 'Copied!';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = '#555';
      tooltip.style.color = 'white';
      tooltip.style.padding = '5px';
      tooltip.style.borderRadius = '6px';
      tooltip.style.zIndex = '1';
      
      this.appendChild(tooltip);
      
      setTimeout(() => {
        tooltip.remove();
      }, 2000);
    });
  });