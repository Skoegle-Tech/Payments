document.addEventListener('DOMContentLoaded', function() {
    const paymentForm = document.getElementById('paymentForm');
    const amountInput = document.getElementById('amount');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const submitButton = document.querySelector('button[type="submit"]');
    
    // Form validation
    function validateForm() {
      let isValid = true;
      
      // Validate name
      if (!nameInput.value.trim()) {
        displayError(nameInput, 'Please enter your name');
        isValid = false;
      } else {
        clearError(nameInput);
      }
      
      // Validate email
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim() || !emailPattern.test(emailInput.value)) {
        displayError(emailInput, 'Please enter a valid email address');
        isValid = false;
      } else {
        clearError(emailInput);
      }
      
      // Validate amount
      if (!amountInput.value || amountInput.value <= 0) {
        displayError(amountInput, 'Please enter a valid amount greater than 0');
        isValid = false;
      } else {
        clearError(amountInput);
      }
      
      return isValid;
    }
    
    // Display error message
    function displayError(inputElement, message) {
      let errorElement = inputElement.parentElement.querySelector('.error-message');
      
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message text-danger mt-1';
        inputElement.parentElement.appendChild(errorElement);
      }
      
      errorElement.textContent = message;
      inputElement.classList.add('is-invalid');
    }
    
    // Clear error message
    function clearError(inputElement) {
      const errorElement = inputElement.parentElement.querySelector('.error-message');
      if (errorElement) {
        errorElement.remove();
      }
      inputElement.classList.remove('is-invalid');
    }
    
    // Handle form submission
    paymentForm.addEventListener('submit', function(e) {
      if (!validateForm()) {
        e.preventDefault();
      } else {
        // Disable submit button to prevent double submission
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
      }
    });
    
    // Validate on input change
    amountInput.addEventListener('input', function() {
      if (this.value && this.value > 0) {
        clearError(this);
      }
    });
    
    nameInput.addEventListener('input', function() {
      if (this.value.trim()) {
        clearError(this);
      }
    });
    
    emailInput.addEventListener('input', function() {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (this.value.trim() && emailPattern.test(this.value)) {
        clearError(this);
      }
    });
    
    // Add amount formatter
    amountInput.addEventListener('blur', function() {
      if (this.value) {
        this.value = parseFloat(this.value).toFixed(2);
      }
    });
  });