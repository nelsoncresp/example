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

const showCartAlert = (message, variant = 'success') => {
  if (!cartAlertEl) {
    return;
  }

  if (cartAlertTimeoutId) {
    clearTimeout(cartAlertTimeoutId);
    cartAlertTimeoutId = null;
  }

  cartAlertEl.className = `alert alert-${variant} mb-0 cart-alert`;
  cartAlertEl.textContent = message;
  cartAlertEl.classList.remove('d-none');
  cartAlertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  cartAlertTimeoutId = setTimeout(() => {
    cartAlertEl.classList.add('d-none');
    cartAlertTimeoutId = null;
  }, 4000);
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
      <li class="cart-item">
        <div class="cart-line">
          <span>${item.name}</span>
          <div class="qty-controls">
            <button class="qty-btn" data-action="decrease" data-index="${index}" type="button">-</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-index="${index}" type="button">+</button>
          </div>
        </div>
        <strong>${formatCOP(item.price * item.qty)}</strong>
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
      cart.push({ name, price, qty: 1 });
    }

    updateCartView();
    openCartSidebar();
    if (checkoutMessage) {
      checkoutMessage.textContent = `${name} fue agregado al carrito.`;
    }
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
});

checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    const emptyMessage = 'Agrega al menos un servicio antes de finalizar la compra.';
    if (checkoutMessage) {
      checkoutMessage.textContent = emptyMessage;
    }
    showCartAlert(emptyMessage, 'warning');
    return;
  }

  const selectedPayment = document.querySelector('input[name="payment"]:checked').value;
  const total = getCartTotal();
  const confirmationMessage = `Compra confirmada por ${formatCOP(total)} con ${selectedPayment}.`;
  if (checkoutMessage) {
    checkoutMessage.textContent = confirmationMessage;
  }
  showCartAlert(confirmationMessage, 'success');
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
