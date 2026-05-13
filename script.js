const cartCountEl = document.getElementById('cart-count');
const cartItemsPageEl = document.getElementById('cart-items-page');
const cartTotalPageEl = document.getElementById('cart-total-page');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutMessage = document.getElementById('checkout-message');
const cartBadge = document.getElementById('cart-badge');
const cartSidebarEl = document.getElementById('carrito');
const paymentArtifactEl = document.getElementById('payment-artifact');
const cartAlertEl = document.getElementById('cart-alert');
const cartLauncherEl = document.getElementById('cart-launcher');
const cartLauncherCountEl = document.getElementById('cart-launcher-count');
const cartCloseEl = document.getElementById('cart-close');
const mainNav = document.getElementById('main-nav');
const paymentInputs = document.querySelectorAll('input[name="payment"]');
let cartAlertTimeoutId = null;

const cart = JSON.parse(localStorage.getItem('sendaMentalCart') || '[]')
  .map((item) => ({
    name: item.name,
    price: Number(item.price) || 0,
    qty: Number(item.qty) > 0 ? Number(item.qty) : 1
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

const openCartSidebar = () => {
  document.body.classList.add('cart-open');
};

const closeCartSidebar = () => {
  document.body.classList.remove('cart-open');
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

const updatePaymentArtifact = () => {
  if (!paymentArtifactEl) {
    return;
  }

  const selectedPayment = document.querySelector('input[name="payment"]:checked');
  if (!selectedPayment || cart.length === 0) {
    paymentArtifactEl.innerHTML = '';
    return;
  }

  const seed = `${getCartTotal()}|${getCartCount()}|${cart.map((item) => `${item.name}:${item.qty}`).join('|')}`;

  if (selectedPayment.value === 'Nequi') {
    paymentArtifactEl.innerHTML = buildFakeQrSvg(seed);
    return;
  }

  const pseudoLink = `https://pago.falso/pse/${seed}`;
  paymentArtifactEl.innerHTML = `
    <div class="payment-link">
      <a href="${pseudoLink}" target="_blank" rel="noopener noreferrer">Ir al pago PSE </a>
      <small>Enlace de demostracion para la entrega</small>
    </div>
  `;
};

const showCartAlert = (title, message, variant = 'success') => {
  if (!cartAlertEl) {
    return;
  }

  if (cartAlertTimeoutId) {
    clearTimeout(cartAlertTimeoutId);
    cartAlertTimeoutId = null;
  }

  const iconColor = variant === 'success' ? '#22C55E' : '#F59E0B';
  
  cartAlertEl.className = `d-flex align-items-start p-3 rounded border bg-white shadow-lg cart-alert-v2`;
  cartAlertEl.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" class="me-3 mt-1 flex-shrink-0">
        <path d="M16.5 8.31V9a7.5 7.5 0 1 1-4.447-6.855M16.5 3 9 10.508l-2.25-2.25" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="me-3 flex-grow-1">
        <h3 class="h6 text-dark fw-bold mb-1" style="font-family: 'Poppins', sans-serif;">${title}</h3>
        <p class="text-secondary small mb-0" style="font-family: 'Poppins', sans-serif; line-height: 1.4;">${message}</p>
    </div>
    <button type="button" aria-label="close" class="ms-auto border-0 bg-transparent p-1 text-secondary opacity-50 hover-opacity-100" onclick="this.parentElement.classList.add('d-none')" style="line-height: 0;">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="12.532" width="17.498" height="2.1" rx="1.05" transform="rotate(-45.74 0 12.532)" fill="currentColor"/>
            <rect x="12.531" y="13.914" width="17.498" height="2.1" rx="1.05" transform="rotate(-135.74 12.531 13.914)" fill="currentColor"/>
        </svg>
    </button>
  `;
  
  cartAlertEl.classList.remove('d-none');
  
  cartAlertTimeoutId = setTimeout(() => {
    cartAlertEl.classList.add('d-none');
    cartAlertTimeoutId = null;
  }, 6000);
};

const updateCartView = () => {
  const cartCount = getCartCount();
  cartCountEl.textContent = cartCount;
  if (cartLauncherCountEl) {
    cartLauncherCountEl.textContent = cartCount;
  }

  if (cart.length === 0) {
    const emptyMarkup = '<li class="empty-state">Todavía no agregas servicios.</li>';
    if (cartItemsPageEl) {
      cartItemsPageEl.innerHTML = emptyMarkup;
    }
    if (cartTotalPageEl) {
      cartTotalPageEl.textContent = '$0 COP';
    }
    saveCart();
    updatePaymentArtifact();
    return;
  }

  const markup = cart
    .map((item, index) => `
      <li class="cart-item py-3">
        <div class="cart-line align-items-start">
          <div class="flex-grow-1">
            <span class="d-block fw-bold mb-1">${item.name}</span>
            <select class="form-select form-select-sm cart-psychologist-select" data-index="${index}" style="font-size: 0.75rem;">
              <option value="" ${!item.psychologist ? 'selected' : ''} disabled>Seleccionar profesional</option>
              <option value="Dra. Valentina Rojas Serrano" ${item.psychologist === 'Dra. Valentina Rojas Serrano' ? 'selected' : ''}>Dra. Valentina Rojas Serrano</option>
              <option value="Dra. Mariana Castano Beltran" ${item.psychologist === 'Dra. Mariana Castano Beltran' ? 'selected' : ''}>Dra. Mariana Castano Beltran</option>
              <option value="Dra. Paula" ${item.psychologist === 'Dra. Paula' ? 'selected' : ''}>Dra. Paula</option>
            </select>
          </div>
          <div class="qty-controls ms-2">
            <button class="qty-btn" data-action="decrease" data-index="${index}" type="button">-</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-index="${index}" type="button">+</button>
          </div>
        </div>
        <div class="text-end mt-2">
          <strong>${formatCOP(item.price * item.qty)}</strong>
        </div>
      </li>
    `)
    .join('');

  const total = getCartTotal();
  if (cartItemsPageEl) {
    cartItemsPageEl.innerHTML = markup;
  }
  if (cartTotalPageEl) {
    cartTotalPageEl.textContent = `${formatCOP(total)} COP`;
  }
  saveCart();
  updatePaymentArtifact();
};

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('.add-to-cart');
  if (addButton) {
    const name = addButton.dataset.name;
    const price = Number(addButton.dataset.price);
    const existing = cart.find((item) => item.name === name);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price, qty: 1, psychologist: '' });
    }

    updateCartView();
    openCartSidebar();
    showCartAlert('Servicio Agregado', `${name} está en tu carrito. Por favor elige tu profesional.`);
    return;
  }

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

  const psychoSelect = event.target.closest('.cart-psychologist-select');
  if (psychoSelect) {
    const index = Number(psychoSelect.dataset.index);
    cart[index].psychologist = psychoSelect.value;
    saveCart();
  }

  // Cerrar carrito al hacer clic fuera
  if (document.body.classList.contains('cart-open')) {
    const isClickInsideSidebar = cartSidebarEl.contains(event.target);
    const isClickOnToggle = event.target.closest('#cart-badge') || 
                            event.target.closest('#cart-launcher') || 
                            event.target.closest('.add-to-cart');
    
    if (!isClickInsideSidebar && !isClickOnToggle) {
      closeCartSidebar();
    }
  }
});

checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    const emptyMessage = 'Agrega al menos un servicio antes de finalizar la compra.';
    if (checkoutMessage) {
      checkoutMessage.textContent = emptyMessage;
    }
    showCartAlert('Carrito Vacío', emptyMessage, 'warning');
    return;
  }

  const selectedPayment = document.querySelector('input[name="payment"]:checked').value;
  
  const pendingPsychologist = cart.some(item => !item.psychologist);
  if (pendingPsychologist) {
    showCartAlert('Faltan datos', 'Por favor elige una psicóloga para todos los servicios.', 'warning');
    return;
  }

  const total = getCartTotal();
  const confirmationMessage = `Compra confirmada por ${formatCOP(total)} con ${selectedPayment}.`;
  if (checkoutMessage) {
    checkoutMessage.textContent = confirmationMessage;
  }
  showCartAlert('¡Pago Exitoso!', 'Tu cita ha sido agendada. Pronto te contactaremos.', 'success');
  cart.length = 0;
  paymentInputs.forEach((input) => {
    if (input.value === 'PSE') {
      input.checked = true;
    }
  });
  updateCartView();
});

paymentInputs.forEach((input) => {
  input.addEventListener('change', () => {
    updatePaymentArtifact();
  });
});

if (cartBadge) {
  cartBadge.addEventListener('click', () => {
    if (document.body.classList.contains('cart-open')) {
      closeCartSidebar();
    } else {
      openCartSidebar();
      if (cartSidebarEl) {
        cartSidebarEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

if (cartLauncherEl) {
  cartLauncherEl.addEventListener('click', () => {
    openCartSidebar();
    if (cartSidebarEl) {
      cartSidebarEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });
}

if (cartCloseEl) {
  cartCloseEl.addEventListener('click', () => {
    closeCartSidebar();
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 992) {
    closeCartSidebar();
  }
});

if (mainNav) {
  mainNav.addEventListener('click', (event) => {
    if (event.target.tagName !== 'A') {
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
