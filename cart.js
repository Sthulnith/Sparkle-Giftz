// Sparkle Giftz - Shared Cart Manager

document.addEventListener('DOMContentLoaded', () => {
    // Initialize cart state
    updateCartUI();

    // Setup Add to Cart buttons on the current page
    setupAddToCartListeners();
    
    // Setup page-specific features
    const path = window.location.pathname;
    if (path.includes('cart.html')) {
        renderCartPage();
    } else if (path.includes('detail.html')) {
        setupDetailPage();
    }
});

// Cart storage keys
const CART_KEY = 'sparkle_cart';

// Get items from cart
function getCart() {
    try {
        const cartStr = localStorage.getItem(CART_KEY);
        return cartStr ? JSON.parse(cartStr) : [];
    } catch (e) {
        console.error('Error parsing cart:', e);
        return [];
    }
}

// Save items to cart
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
}

// Add item to cart
function addToCart(item) {
    const cart = getCart();
    // Check if item with same id and same options already exists
    const existingIndex = cart.findIndex(i => 
        i.id === item.id && 
        JSON.stringify(i.options || {}) === JSON.stringify(item.options || {})
    );

    if (existingIndex > -1) {
        cart[existingIndex].quantity += item.quantity;
    } else {
        cart.push(item);
    }

    saveCart(cart);
    showToast(`${item.name} added to cart!`);
}

// Remove item from cart
function removeFromCart(id, optionsStr) {
    let cart = getCart();
    cart = cart.filter(i => !(i.id === id && JSON.stringify(i.options || {}) === optionsStr));
    saveCart(cart);
    if (window.location.pathname.includes('cart.html')) {
        renderCartPage();
    }
}

// Update item quantity
function updateQuantity(id, optionsStr, delta) {
    const cart = getCart();
    const index = cart.findIndex(i => i.id === id && JSON.stringify(i.options || {}) === optionsStr);
    
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);
        if (window.location.pathname.includes('cart.html')) {
            renderCartPage();
        }
    }
}

// Update cart counter badges in the DOM
function updateCartUI() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update all elements with class 'cart-badge' or matching text counts
    const badges = document.querySelectorAll('.cart-badge, [class*="shopping_cart"] + span');
    badges.forEach(badge => {
        badge.innerText = count;
        if (count > 0) {
            badge.classList.remove('hidden');
        } else {
            // Keep it visible as 0 or hide it based on original style, original was 0/2
            badge.innerText = count;
        }
    });
}

// Toast notification helper
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-8 right-8 bg-[#1a1a1a] border border-[#c9a227] text-[#ecc246] px-6 py-4 font-label-caps text-xs tracking-widest shadow-2xl z-50 flex items-center gap-3 transition-all duration-500 transform translate-y-20 opacity-0';
    toast.innerHTML = `
        <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">stars</span>
        <span>${message.toUpperCase()}</span>
    `;
    document.body.appendChild(toast);
    
    // Trigger transition
    setTimeout(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    }, 100);

    // Fade out and remove
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Hook up all buttons with custom actions
function setupAddToCartListeners() {
    // 1. Home / Index Page Products
    // Product 1: The Midnight Noir ($145.00)
    // Product 2: Velvet Romance ($189.00)
    // Product 3: The Executive Suite ($220.00)
    // Product 4: Gentle Beginnings ($120.00)
    
    // 2. Shop Page Products
    // Executive Corporate Suite ($245.00)
    // Midnight Serenity Ritual ($135.00)
    // Vows & Vintage Toast ($220.00)
    // Epicurean Global Voyage ($195.00)
    // Midnight Celebration Spark ($95.00)
    // Celestial Home Sanctuary ($140.00)
    
    // Find all product card structures in the DOM and automatically extract details
    const cards = document.querySelectorAll('.group.relative.bg-surface-container-low, .product-card');
    cards.forEach(card => {
        const btn = card.querySelector('button');
        if (!btn || btn.innerText.includes('OUT OF STOCK')) return;
        
        // Check if button is for details or select options
        if (btn.innerText.includes('SELECT OPTIONS') || btn.innerText.includes('VIEW DETAILS')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'detail.html';
            });
            return;
        }

        // Get details
        const titleEl = card.querySelector('h3, h2');
        if (!titleEl) return;
        
        const title = titleEl.innerText;
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const priceEl = card.querySelector('.text-primary.font-semibold, .text-primary');
        if (!priceEl) return;
        
        // Extract number from price like "$145.00" -> 145.00
        const priceStr = priceEl.innerText.split('$')[1] || '0';
        const price = parseFloat(priceStr);

        const imgEl = card.querySelector('.bg-cover, img');
        let image = '';
        if (imgEl) {
            if (imgEl.tagName === 'IMG') {
                image = imgEl.src;
            } else {
                // Background image url('...')
                const style = imgEl.style.backgroundImage || imgEl.getAttribute('style') || '';
                const match = style.match(/url\(['"]?([^'"]+?)['"]?\)/);
                image = match ? match[1] : '';
            }
        }

        // Add event listener to button
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            addToCart({
                id,
                name: title,
                price: price,
                image: image,
                quantity: 1,
                options: {}
            });
        });
    });
}

// Details Page Specific Logic
function setupDetailPage() {
    const addToCartBtn = document.querySelector('button.flex-grow.h-14');
    if (!addToCartBtn) return;

    const priceSpan = document.querySelector('span.text-primary.font-display-lg');
    const wrappingCheckbox = document.querySelector('input[type="checkbox"]');
    
    // Parse the base price from the page immediately
    const basePriceStr = priceSpan ? (priceSpan.innerText.split('$')[1] || '245.00') : '245.00';
    const basePrice = parseFloat(basePriceStr);

    if (priceSpan && wrappingCheckbox) {
        // Add dynamic change listener to update UI
        wrappingCheckbox.addEventListener('change', () => {
            const currentPrice = basePrice + (wrappingCheckbox.checked ? 15.00 : 0);
            priceSpan.innerText = `$${currentPrice.toFixed(2)}`;
        });
    }

    addToCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Extract elements
        const name = document.querySelector('h1').innerText;
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        let price = basePrice;

        const quantityInput = document.querySelector('input[type="number"]');
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

        const messageInput = document.querySelector('input[placeholder="Enter your words of affection..."]');
        const message = messageInput ? messageInput.value.trim() : '';

        const wrapping = wrappingCheckbox ? wrappingCheckbox.checked : false;

        const imgEl = document.querySelector('main img');
        const image = imgEl ? imgEl.src : '';

        const options = {};
        if (message) options.message = message;
        if (wrapping) {
            options.wrapping = true;
            price += 15.00; // Premium Wrapping Cost
        }

        addToCart({
            id,
            name,
            price,
            image,
            quantity,
            options
        });
    });
}

// Cart Page Specific Logic
function renderCartPage() {
    const container = document.getElementById('cart-content');
    const emptyState = document.getElementById('empty-state');
    if (!container) return;

    const cart = getCart();
    
    if (cart.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        return;
    }

    container.classList.remove('hidden');
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    // Build the items list container
    const itemsCol = container.querySelector('.lg:col-span-8');
    // Clear out old product rows (keep header and continue shopping block)
    const rows = itemsCol.querySelectorAll('.item-row');
    rows.forEach(r => r.remove());

    // Generate row for each cart item
    cart.forEach(item => {
        const optionsStr = JSON.stringify(item.options || {});
        const row = document.createElement('div');
        row.className = 'item-row grid grid-cols-1 md:grid-cols-12 gap-4 py-6 gold-border-bottom items-center transition-colors';
        
        // Options layout HTML
        let optionsHtml = '';
        if (item.options && Object.keys(item.options).length > 0) {
            optionsHtml = '<div class="mt-1 text-[11px] text-primary/80 font-label-caps space-y-0.5">';
            if (item.options.message) optionsHtml += `<div>NOTE: "${item.options.message}"</div>`;
            if (item.options.wrapping) optionsHtml += `<div>PREMIUM GOLD-FOIL WRAPPING</div>`;
            optionsHtml += '</div>';
        }

        row.innerHTML = `
            <div class="col-span-1 md:col-span-6 flex items-center space-x-6">
                <div class="w-24 h-24 bg-surface-container-high gold-border flex-shrink-0 overflow-hidden">
                    <img class="w-full h-full object-cover transition-transform duration-500" src="${item.image}" alt="${item.name}"/>
                </div>
                <div>
                    <h3 class="font-headline-md text-body-lg text-primary mb-1">${item.name}</h3>
                    <p class="font-label-caps text-[10px] text-outline-variant uppercase">ID: ${item.id}</p>
                    ${optionsHtml}
                    <button class="mt-2 text-outline-variant hover:text-error transition-colors flex items-center space-x-1" onclick="removeFromCart('${item.id}', '${optionsStr.replace(/'/g, "\\'")}')">
                        <span class="material-symbols-outlined text-sm">close</span>
                        <span class="font-label-caps text-[10px] tracking-widest">Remove</span>
                    </button>
                </div>
            </div>
            <div class="col-span-1 md:col-span-2 text-left md:text-center">
                <span class="md:hidden font-label-caps text-[10px] text-outline uppercase block mb-1">Price</span>
                <span class="text-on-surface">$${item.price.toFixed(2)}</span>
            </div>
            <div class="col-span-1 md:col-span-2 flex justify-start md:justify-center">
                <div class="flex items-center gold-border px-2 py-1">
                    <button class="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" onclick="updateQuantity('${item.id}', '${optionsStr.replace(/'/g, "\\'")}', -1)">-</button>
                    <span class="px-4 text-sm font-label-caps">${item.quantity.toString().padStart(2, '0')}</span>
                    <button class="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" onclick="updateQuantity('${item.id}', '${optionsStr.replace(/'/g, "\\'")}', 1)">+</button>
                </div>
            </div>
            <div class="col-span-1 md:col-span-2 text-left md:text-right">
                <span class="md:hidden font-label-caps text-[10px] text-outline uppercase block mb-1">Subtotal</span>
                <span class="text-primary font-semibold">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;

        // Add hover effects for dynamically created items
        row.addEventListener('mouseenter', () => {
            const img = row.querySelector('img');
            if (img) img.style.transform = 'scale(1.05)';
        });
        row.addEventListener('mouseleave', () => {
            const img = row.querySelector('img');
            if (img) img.style.transform = 'scale(1)';
        });

        // Insert before the bottom row (continue shopping block)
        const bottomRow = itemsCol.querySelector('.pt-8');
        itemsCol.insertBefore(row, bottomRow);
    });

    // Calculate prices
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; // Free shipping

    // Update summary sidebar
    const summaryCard = container.querySelector('.lg:col-span-4');
    if (summaryCard) {
        summaryCard.querySelector('.font-semibold').innerText = `$${subtotal.toFixed(2)}`;
        summaryCard.querySelector('.font-bold').innerText = `$${total.toFixed(2)}`;
        
        // Hook up proceed button
        const proceedBtn = summaryCard.querySelector('button');
        if (proceedBtn) {
            proceedBtn.onclick = () => {
                showToast("PREPARING SECURE CHECKOUT GATEWAY...");
                setTimeout(() => {
                    alert("Thank you for your order! In a production build, this would redirect to a secure payment gateway.");
                    localStorage.removeItem(CART_KEY);
                    renderCartPage();
                }, 1500);
            };
        }
    }
}
