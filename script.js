const cartCountEl = document.getElementById('cart-count');
const cartItemsPageEl = document.getElementById('cart-items-page');
const cartTotalPageEl = document.getElementById('cart-total-page');
const checkoutBtn = document.getElementById('btn-go-checkout');
const checkoutMessage = document.getElementById('checkout-message');
const checkoutTotalValEl = document.getElementById('checkout-total-val');
const cartBadge = document.getElementById('cart-badge');
const paymentArtifactEl = document.getElementById('payment-artifact');
const cartAlertEl = document.getElementById('cart-alert');
const cartLauncherEl = document.getElementById('cart-launcher');
const cartLauncherCountEl = document.getElementById('cart-launcher-count');
const mainNav = document.getElementById('main-nav');
const paymentInputs = document.querySelectorAll('input[name="payment"]');
const btnOpenContact = document.getElementById('btn-open-contact');
const btnBackHome = document.getElementById('btn-back-home');
let isPaymentConfirmed = false;
const contactForm = document.getElementById('contact-form');
let cartAlertTimeoutId = null;

const cart = JSON.parse(localStorage.getItem('sendaMentalCart') || '[]')
  .map((item) => ({
    name: item.name,
    price: Number(item.price) || 0,
    qty: Number(item.qty) > 0 ? Number(item.qty) : 1,
    clientName: item.clientName || '',
    psychologist: item.psychologist || '',
    date: item.date || ''
  }))
  .filter((item) => item.name && item.price > 0);

const formatCOP = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
}).format(value);

const saveCart = () => {
  localStorage.setItem('sendaMentalCart', JSON.stringify(cart));
};

const getCartCount = () => cart.reduce((sum, item) => sum + item.qty, 0);

const getCartTotal = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

const hashString = (input) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return hash >>> 0;
};

const buildFakeQrSvg = (seedText) => {
  const size = 21;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const random = (() => {
    let state = hashString(seedText) || 1;

    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return Math.abs(state) / 2147483647;
    };
  })();

  const paintFinder = (startX, startY) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const border = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        matrix[startY + y][startX + x] = border || core;
      }
    }
  };

  paintFinder(0, 0);
  paintFinder(size - 7, 0);
  paintFinder(0, size - 7);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inTopLeft = x < 7 && y < 7;
      const inTopRight = x >= size - 7 && y < 7;
      const inBottomLeft = x < 7 && y >= size - 7;

      if (inTopLeft || inTopRight || inBottomLeft) {
        continue;
      }

      matrix[y][x] = random() > 0.63;
    }
  }

  const cellSize = 10;
  const rects = [];

  matrix.forEach((row, y) => {
    row.forEach((filled, x) => {
      if (filled) {
        rects.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" rx="1" />`);
      }
    });
  });

  return `
    <svg viewBox="0 0 ${size * cellSize} ${size * cellSize}" role="img" aria-label="Codigo QR de Nequi" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff" />
      ${rects.join('')}
    </svg>
    <div class="qr-caption">QR prueba para Nequi</div>
  `;
};

const cardFieldsEl = document.getElementById('card-fields');

const updatePaymentArtifact = () => {
  if (!paymentArtifactEl) {
    return;
  }

  const selectedPayment = document.querySelector('input[name="payment"]:checked');
  if (!selectedPayment || cart.length === 0) {
    paymentArtifactEl.innerHTML = '';
    if (cardFieldsEl) cardFieldsEl.classList.add('d-none');
    return;
  }

  const seed = `${getCartTotal()}|${getCartCount()}|${cart.map((item) => `${item.name}:${item.qty}`).join('|')}`;

  const generateCashCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = letters[Math.floor(Math.random() * 26)];
    const l2 = letters[Math.floor(Math.random() * 26)];
    const nums = String(Math.floor(100000 + Math.random() * 900000));
    return l1 + l2 + nums;
  };

  const invoiceBtn = `<button class="btn btn-sm btn-outline-primary mt-3" id="btn-download-invoice">Descargar Factura</button>`;
  const paymentRef = 'PAG-' + Math.random().toString(36).substr(2, 8).toUpperCase();

  if (selectedPayment.value === 'Nequi') {
    paymentArtifactEl.innerHTML = buildFakeQrSvg(seed) + `<p class="small text-muted mt-2 mb-0">Referencia: <strong>${paymentRef}</strong></p>` + (isPaymentConfirmed ? invoiceBtn : '');
    if (cardFieldsEl) cardFieldsEl.classList.add('d-none');
    return;
  }

  if (selectedPayment.value === 'Card') {
    paymentArtifactEl.innerHTML = `<p class="text-muted small mb-3">Ingresa los datos de tu tarjeta abajo</p>` + `<p class="small text-muted mb-0">Referencia: <strong>${paymentRef}</strong></p>` + (isPaymentConfirmed ? invoiceBtn : '');
    if (cardFieldsEl) cardFieldsEl.classList.remove('d-none');
    return;
  }

  if (selectedPayment.value === 'Cash') {
    const cashCode = generateCashCode();
    paymentArtifactEl.innerHTML = `
      <div class="cash-ticket">
        <div class="text-center mb-2">
          <i class="fa-solid fa-receipt fs-1 text-success"></i>
        </div>
        <h5 class="fw-bold text-center mb-1">Pago en Efectivo</h5>
        <p class="text-muted small text-center mb-2">Presenta este codigo en nuestro consultorio</p>
        <div class="bg-white border rounded-3 p-3 text-center mb-2">
          <strong class="fs-1 text-dark">${cashCode}</strong>
        </div>
        <p class="small text-muted text-center mb-0">Referencia: <strong>${paymentRef}</strong></p>
        <p class="small text-muted text-center mb-2">Total: <strong class="text-dark">${formatCOP(getCartTotal())}</strong></p>
        ${invoiceBtn}
      </div>
    `;
    if (cardFieldsEl) cardFieldsEl.classList.add('d-none');
    return;
  }

  const pseudoLink = `https://pago.falso/pse/${seed}`;
  paymentArtifactEl.innerHTML = `
    <div class="payment-link">
      <a href="${pseudoLink}" target="_blank" rel="noopener noreferrer">Ir al pago PSE </a>
      <small>Enlace de demostracion para la entrega</small>
    </div>
    <p class="small text-muted mt-2 mb-0">Referencia: <strong>${paymentRef}</strong></p>
    ` + (isPaymentConfirmed ? invoiceBtn : '');
  if (cardFieldsEl) cardFieldsEl.classList.add('d-none');
};

const showCartAlert = (title, message, variant = 'success') => {
  console.log('showCartAlert called:', { title, message, variant });
  if (!cartAlertEl) {
    console.error('cartAlertEl not found');
    return;
  }

  if (cartAlertTimeoutId) {
    clearTimeout(cartAlertTimeoutId);
    cartAlertTimeoutId = null;
  }

  const iconColor = variant === 'success' ? '#22C55E' : '#F59E0B';

  cartAlertEl.className = `d-flex align-items-start p-3 rounded border bg-white shadow-lg cart-alert-v2 cart-alert animate__animated animate__fadeInRight`;
  cartAlertEl.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" class="me-3 mt-1 flex-shrink-0">
        <path d="M16.5 8.31V9a7.5 7.5 0 1 1-4.447-6.855M16.5 3 9 10.508l-2.25-2.25" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="me-3 flex-grow-1">
        <h3 class="h6 text-dark fw-bold mb-1" style="font-family: 'Poppins', sans-serif;">${title}</h3>
        <p class="text-secondary small mb-0" style="font-family: 'Poppins', sans-serif; line-height: 1.4;">${message}</p>
    </div>
    <button type="button" aria-label="close" class="ms-auto border-0 bg-transparent p-1 text-secondary opacity-50 hover-opacity-100" onclick="this.closest('.cart-alert').classList.add('animate__fadeOutRight')" style="line-height: 0;">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="12.532" width="17.498" height="2.1" rx="1.05" transform="rotate(-45.74 0 12.532)" fill="currentColor"/>
            <rect x="12.531" y="13.914" width="17.498" height="2.1" rx="1.05" transform="rotate(-135.74 12.531 13.914)" fill="currentColor"/>
        </svg>
    </button>
  `;

  cartAlertEl.classList.remove('d-none');

  cartAlertTimeoutId = setTimeout(() => {
    cartAlertEl.classList.add('animate__fadeOutRight');
    setTimeout(() => {
      cartAlertEl.classList.add('d-none');
      cartAlertEl.classList.remove('animate__fadeOutRight');
    }, 1000);
    cartAlertTimeoutId = null;
  }, 6000);
};

//const checkoutTotalValEl = document.getElementById('checkout-total-val');
const checkoutSummaryList = document.getElementById('checkout-summary-list');

// -----------------------------------------
// VISTAS SPA
// -----------------------------------------
const mainView = document.getElementById('main-view');
const contactView = document.getElementById('contact-view');
const cartView = document.getElementById('cart-view');
const checkoutView = document.getElementById('checkout-view');

const showView = (view) => {
  [mainView, contactView, cartView, checkoutView].forEach(v => {
    if (v) v.classList.add('d-none');
  });
  if (view) {
    view.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === cartView) {
      updatePaymentArtifact();
    }
  }
};

const updateCartView = () => {
  const cartCount = getCartCount();
  if (cartCountEl) cartCountEl.textContent = cartCount;
  if (cartLauncherCountEl) cartLauncherCountEl.textContent = cartCount;

  const paymentSection = document.querySelector('.payment-section');
  const checkoutBtnEl = document.getElementById('btn-go-checkout');
  
  if (cart.length === 0) {
    if (cartItemsPageEl) {
      cartItemsPageEl.innerHTML = '<li class="empty-state text-center text-muted py-4"><i class="fa-solid fa-cart-shopping fs-1 d-block mb-3 opacity-25"></i>Agrega un servicio para continuar</li>';
    }
    if (cartTotalPageEl) cartTotalPageEl.textContent = '$0 COP';
    if (paymentSection) paymentSection.classList.add('d-none');
    if (checkoutBtnEl) checkoutBtnEl.disabled = true;
    saveCart();
    return;
  }

  if (paymentSection) paymentSection.classList.remove('d-none');
  if (checkoutBtnEl) checkoutBtnEl.disabled = false;

  const markup = cart
    .map((item, index) => `
      <li class="cart-item py-3 border-bottom border-light-subtle">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fs-5 fw-bold text-dark">${item.name}</span>
          <div class="qty-controls bg-light rounded-3 px-2 py-1">
            <button class="btn btn-sm btn-link text-dark text-decoration-none fw-bold qty-btn" data-action="decrease" data-index="${index}" type="button">-</button>
            <span class="qty-value mx-2 fw-bold">${item.qty}</span>
            <button class="btn btn-sm btn-link text-dark text-decoration-none fw-bold qty-btn" data-action="increase" data-index="${index}" type="button">+</button>
          </div>
        </div>
        <div class="d-flex flex-column text-muted small">
          <span><i class="fa-solid fa-user-doctor me-2"></i> ${item.psychologist}</span>
          <span><i class="fa-regular fa-calendar me-2"></i> ${item.date}</span>
        </div>
        <div class="text-end mt-2">
          <strong class="fs-5 text-primary">${formatCOP(item.price * item.qty)}</strong>
        </div>
      </li>
    `)
    .join('');

  const total = getCartTotal();
  if (cartItemsPageEl) cartItemsPageEl.innerHTML = markup;
  if (cartTotalPageEl) cartTotalPageEl.textContent = `${formatCOP(total)} COP`;
  if (checkoutTotalValEl) checkoutTotalValEl.textContent = `${formatCOP(total)} COP`;

  if (checkoutSummaryList) {
    checkoutSummaryList.innerHTML = cart.map(item => `
      <li class="d-flex justify-content-between mb-2">
        <span>${item.qty}x ${item.name}</span>
        <strong class="text-dark">${formatCOP(item.price * item.qty)}</strong>
      </li>
    `).join('');
  }
  saveCart();
};

let pendingCartItem = null;

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('.add-to-cart');
  if (addButton) {
    const name = addButton.dataset.name;
    const price = Number(addButton.dataset.price);

    // Preparar el modal
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('modal-service-name').textContent = name;
    document.getElementById('modal-service-price').textContent = `${formatCOP(price)} COP`;
    document.getElementById('modal-name-input').value = '';
    document.getElementById('modal-psychologist-select').value = '';
    document.getElementById('modal-date-input').value = today;

    pendingCartItem = { name, price };

    // Abrir Modal
    const modalEl = document.getElementById('modal-agendar');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
    return;
  }
});

const btnConfirmAddCart = document.getElementById('btn-confirm-add-cart');
if (btnConfirmAddCart) {
  btnConfirmAddCart.addEventListener('click', () => {
    const nameInput = document.getElementById('modal-name-input').value.trim();
    const psycho = document.getElementById('modal-psychologist-select').value;
    const date = document.getElementById('modal-date-input').value;

    if (!nameInput) {
      showCartAlert('Faltan datos', 'Por favor ingresa tu nombre.', 'warning');
      return;
    }

    if (!psycho || !date) {
      showCartAlert('Faltan datos', 'Por favor selecciona la profesional y la fecha deseada.', 'warning');
      return;
    }

    if (pendingCartItem) {
      const existing = cart.find(item => item.name === pendingCartItem.name && item.psychologist === psycho && item.date === date);

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ ...pendingCartItem, qty: 1, clientName: nameInput, psychologist: psycho, date: date });
      }

      saveCart();
      updateCartView();

      // Cerrar modal
      const modalEl = document.getElementById('modal-agendar');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // Ir a la vista del carrito
      showView(cartView);
    }
  });
}

document.addEventListener('click', (event) => {
  const qtyButton = event.target.closest('.qty-btn');
  if (qtyButton) {
    const index = Number(qtyButton.dataset.index);
    const action = qtyButton.dataset.action;
    const item = cart[index];

    if (!item) {
      return;
    }

    if (action === 'increase') {
      item.qty += 1;
    }

    if (action === 'decrease') {
      item.qty -= 1;
      if (item.qty <= 0) {
        cart.splice(index, 1);
      }
    }

    updateCartView();
  }

  // Cerrar carrito al hacer clic fuera
  if (event.target.closest('#cart-badge') || event.target.closest('#cart-launcher')) {
    showView(cartView);
    return;
  }
});

if (checkoutBtn) {
  checkoutBtn.addEventListener('click', () => {
  console.log('Checkout clicked. Cart size:', cart.length);
  if (cart.length === 0) {
    showCartAlert('Carrito Vacío', 'Agrega al menos un servicio antes de finalizar la compra.', 'warning');
    return;
  }

  const selectedPaymentEl = document.querySelector('input[name="payment"]:checked');
  const selectedPayment = selectedPaymentEl ? selectedPaymentEl.value : 'PSE';
  console.log('Payment method:', selectedPayment);

  if (selectedPayment === 'Card') {
    const cardType = document.getElementById('card-type')?.value;
    const cardNumber = document.getElementById('card-number')?.value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('card-expiry')?.value;
    const cardCvv = document.getElementById('card-cvv')?.value;
    const cardName = document.getElementById('card-name')?.value;

    if (!cardType || !cardNumber || !cardExpiry || !cardCvv || !cardName) {
      showCartAlert('Faltan datos', 'Por favor completa todos los campos de la tarjeta.', 'warning');
      return;
    }

    if (cardNumber.length < 13 || cardNumber.length > 19) {
      showCartAlert('Número inválido', 'El número de tarjeta debe tener entre 13 y 19 dígitos.', 'warning');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      showCartAlert('Fecha inválida', 'La fecha de expiración debe tener el formato MM/AA.', 'warning');
      return;
    }

    if (cardCvv.length < 3 || cardCvv.length > 4) {
      showCartAlert('CVV inválido', 'El CVV debe tener 3 o 4 dígitos.', 'warning');
      return;
    }
  }

  const pendingPsychologist = cart.some(item => !item.psychologist);
  const pendingDate = cart.some(item => !item.date);
  if (pendingPsychologist || pendingDate) {
    console.log('Psychologist or date selection pending');
    showCartAlert('Faltan datos', 'Por favor elige una psicóloga y una fecha para todos los servicios.', 'warning');
    return;
  }

  const total = getCartTotal();
  console.log('Processing checkout for total:', total);
  showCartAlert('¡Pago Exitoso!', 'Tu cita ha sido agendada. Pronto te contactaremos.', 'success');

  cart.splice(0, cart.length);
  saveCart();

  paymentInputs.forEach((input) => {
    if (input.value === 'PSE') input.checked = true;
  });

  if (cardFieldsEl) cardFieldsEl.classList.add('d-none');
  document.getElementById('card-type').value = '';
  document.getElementById('card-number').value = '';
  document.getElementById('card-expiry').value = '';
  document.getElementById('card-cvv').value = '';
  document.getElementById('card-name').value = '';

  if (checkoutSummaryList) checkoutSummaryList.innerHTML = '';
  if (checkoutTotalValEl) checkoutTotalValEl.textContent = '$0 COP';
  if (paymentArtifactEl) paymentArtifactEl.innerHTML = '';

  updateCartView();
  
  setTimeout(() => {
    showView(mainView);
  }, 1500);
  
  console.log('Checkout flow complete. Cart size:', cart.length);
  });
}

paymentInputs.forEach((input) => {
  input.addEventListener('change', () => {
    updatePaymentArtifact();
  });
});

// SPA navigation logic using showView() handles all view switching now.

if (mainNav) {
  mainNav.addEventListener('click', (event) => {
    const isLink = event.target.tagName === 'A' || event.target.closest('a');
    if (!isLink) {
      return;
    }

    if (window.bootstrap && window.bootstrap.Collapse) {
      const collapseInstance = window.bootstrap.Collapse.getInstance(mainNav);
      if (collapseInstance) {
        collapseInstance.hide();
      }
    }
  });
}

updateCartView();
updatePaymentArtifact();

const initScrollAnimations = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const animation = entry.target.dataset.animation || 'animate__fadeIn';
        entry.target.classList.add('animate__animated', animation);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el);
  });
};

initScrollAnimations();

// SPA y eventos change
document.addEventListener('change', (event) => {
  const psychoSelect = event.target.closest('.cart-psychologist-select');
  if (psychoSelect) {
    const index = Number(psychoSelect.dataset.index);
    cart[index].psychologist = psychoSelect.value;
    saveCart();
  }

  const dateInput = event.target.closest('.cart-date-input');
  if (dateInput) {
    const index = Number(dateInput.dataset.index);
    cart[index].date = dateInput.value;
    saveCart();
  }
});

const btnGoCheckout = document.getElementById('btn-go-checkout');
const btnBackCart = document.getElementById('btn-back-cart');
const btnBackHomeCart = document.getElementById('btn-back-home-cart');

if (btnGoCheckout) {
  btnGoCheckout.addEventListener('click', () => {
    if (cart.length === 0) return;
    
    const selectedPaymentEl = document.querySelector('input[name="payment"]:checked');
    const selectedPayment = selectedPaymentEl ? selectedPaymentEl.value : 'PSE';

    if (selectedPayment === 'Card') {
      const cardType = document.getElementById('card-type')?.value;
      const cardNumber = document.getElementById('card-number')?.value.replace(/\s/g, '');
      const cardExpiry = document.getElementById('card-expiry')?.value;
      const cardCvv = document.getElementById('card-cvv')?.value;
      const cardName = document.getElementById('card-name')?.value;

      if (!cardType || !cardNumber || !cardExpiry || !cardCvv || !cardName) {
        showCartAlert('Faltan datos', 'Por favor completa todos los campos de la tarjeta.', 'warning');
        return;
      }

      if (cardNumber.length < 13 || cardNumber.length > 19) {
        showCartAlert('Número inválido', 'El número de tarjeta debe tener entre 13 y 19 dígitos.', 'warning');
        return;
      }

      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        showCartAlert('Fecha inválida', 'La fecha de expiración debe tener el formato MM/AA.', 'warning');
        return;
      }

      if (cardCvv.length < 3 || cardCvv.length > 4) {
        showCartAlert('CVV inválido', 'El CVV debe tener 3 o 4 dígitos.', 'warning');
        return;
      }
    }

    const pendingPsychologist = cart.some(item => !item.psychologist);
    const pendingDate = cart.some(item => !item.date);
    if (pendingPsychologist || pendingDate) {
      showCartAlert('Faltan datos', 'Por favor elige una psicóloga y una fecha para todos los servicios.', 'warning');
      return;
    }

    const originalContent = checkoutBtn.innerHTML;
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

    setTimeout(() => {
      showCartAlert('¡Pago Exitoso!', 'Tu cita ha sido agendada. Pronto te contactaremos.', 'success');
      isPaymentConfirmed = true;
      checkoutBtn.innerHTML = 'Pagado';
      checkoutBtn.classList.replace('btn-senda', 'btn-success');
      updatePaymentArtifact();

      // Limpiar carrito después de un momento
      setTimeout(() => {
        cart.splice(0, cart.length);
        saveCart();
        updateCartView();
        isPaymentConfirmed = false;
        
        const cardFieldsEl = document.getElementById('card-fields');
        if (cardFieldsEl) cardFieldsEl.classList.add('d-none');
        
        const paymentArtifactEl = document.getElementById('payment-artifact');
        if (paymentArtifactEl) paymentArtifactEl.innerHTML = '';
        
        checkoutBtn.innerHTML = originalContent;
        checkoutBtn.classList.replace('btn-success', 'btn-senda');
      }, 5000);
    }, 2000);
  });
}

if (btnBackCart) {
  btnBackCart.addEventListener('click', () => {
    showView(cartView);
  });
}

if (btnBackHomeCart) {
  btnBackHomeCart.addEventListener('click', () => {
    showView(mainView);
  });
}

const navCartBtn = document.getElementById('nav-cart-btn');
if (navCartBtn) {
  navCartBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView(cartView);
  });
}

if (btnOpenContact) {
  btnOpenContact.addEventListener('click', () => {
    showView(contactView);
  });
}

if (btnBackHome) {
  btnBackHome.addEventListener('click', () => {
    showView(mainView);
  });
}

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-contact');
    const spinner = document.getElementById('contact-spinner');
    const successAlert = document.getElementById('contact-success');

    btnSubmit.disabled = true;
    spinner.classList.remove('d-none');

    setTimeout(() => {
      spinner.classList.add('d-none');
      successAlert.classList.remove('d-none');
      contactForm.reset();

      setTimeout(() => {
        successAlert.classList.add('d-none');
        btnSubmit.disabled = false;
        if (btnBackHome) btnBackHome.click();
      }, 4000);
    }, 1500);
  });
}

const cardNumberInput = document.getElementById('card-number');
const cardExpiryInput = document.getElementById('card-expiry');

if (cardNumberInput) {
  cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    e.target.value = value;
  });
}

if (cardExpiryInput) {
  cardExpiryInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
  });
}

const whatsappFab = document.querySelector('.whatsapp-fab');
if (whatsappFab) {
  const showWhatsappTooltip = () => {
    if (window.innerWidth > 768) {
      whatsappFab.classList.add('show-tooltip');
      setTimeout(() => {
        whatsappFab.classList.remove('show-tooltip');
      }, 4000);
    }
  };
  
  setTimeout(showWhatsappTooltip, 3000);
  setInterval(showWhatsappTooltip, 15000);
}

document.addEventListener('click', function(e) {
  if (e.target.id === 'btn-download-invoice') {
    const invoiceNum = 'INV-' + Date.now().toString(36).toUpperCase();
    const paymentCode = 'PAG-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    const date = new Date().toLocaleDateString('es-CO');
    const time = new Date().toLocaleTimeString('es-CO');
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    const paymentMethod = selectedPayment ? selectedPayment.value : 'PSE';
    const clientName = cart[0] ? cart[0].clientName : 'Cliente';
    const itemsHtml = cart.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${formatCOP(item.price)}</td><td>${formatCOP(item.price * item.qty)}</td></tr>`).join('');
    const total = formatCOP(getCartTotal());
    const html = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto}h1{font-size:20px;margin-bottom:4px;color:#1e293b}p{color:#64748b;font-size:13px;margin:2px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f8fafc;text-align:left;padding:10px;font-size:12px;color:#475569}td{padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:24px;color:#0f172a}.footer{border-top:1px solid #e2e8f0;margin-top:30px;padding-top:16px;font-size:11px;color:#94a3b8;text-align:center}</style></head><body><h1>Salud Mental</h1><p>Consultorio Psicologico</p><p>Nit: 901.234.567-1</p><hr style="margin-top:16px"><p><strong>Factura:</strong> ${invoiceNum}</p><p><strong>Cliente:</strong> ${clientName}</p><p><strong>Fecha:</strong> ${date} - ${time}</p><p><strong>Metodo de pago:</strong> ${paymentMethod}</p><p><strong>Codigo de pago:</strong> ${paymentCode}</p><table><tr><th>Servicio</th><th>Cant</th><th>Precio</th><th>Total</th></tr>${itemsHtml}</table><div class="total">Total: ${total}</div><div class="footer">Gracias por confiar en nosotros</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
