// Inline scripts for working prototype interactivity
// These are embedded as <script> tags inside rendered HTML

export function prototypeScripts(): string {
  return `<script>
(function() {
  // ─── Form Validation ───────────────────────────────────────
  document.querySelectorAll('form, [data-form]').forEach(function(form) {
    form.addEventListener('submit', function(e) { e.preventDefault(); });
  });

  document.querySelectorAll('input[required], input[type="email"], input[type="password"]').forEach(function(input) {
    input.addEventListener('blur', function() {
      var val = this.value.trim();
      var type = this.type;
      var error = this.parentElement.querySelector('.field-error');

      if (!error) {
        error = document.createElement('p');
        error.className = 'field-error';
        error.style.cssText = 'color:#ef4444;font-size:11px;margin-top:4px;display:none;';
        this.parentElement.appendChild(error);
      }

      if (!val) {
        error.textContent = 'This field is required';
        error.style.display = 'block';
        this.style.borderColor = '#ef4444';
      } else if (type === 'email' && !/^[^@]+@[^@]+\\.[^@]+$/.test(val)) {
        error.textContent = 'Please enter a valid email address';
        error.style.display = 'block';
        this.style.borderColor = '#ef4444';
      } else if (type === 'password' && val.length < 6) {
        error.textContent = 'Password must be at least 6 characters';
        error.style.display = 'block';
        this.style.borderColor = '#ef4444';
      } else {
        error.style.display = 'none';
        this.style.borderColor = '#e5e7eb';
      }
    });

    input.addEventListener('focus', function() {
      this.style.borderColor = '#22c55e';
      var error = this.parentElement.querySelector('.field-error');
      if (error) error.style.display = 'none';
    });
  });

  // ─── Table Sorting ─────────────────────────────────────────
  document.querySelectorAll('th').forEach(function(th, colIndex) {
    th.style.cursor = 'pointer';
    th.title = 'Click to sort';
    th.addEventListener('click', function() {
      var table = this.closest('table');
      if (!table) return;
      var tbody = table.querySelector('tbody');
      if (!tbody) return;
      var rows = Array.from(tbody.querySelectorAll('tr'));
      var idx = Array.from(this.parentElement.children).indexOf(this);
      var asc = this.dataset.sort !== 'asc';
      this.dataset.sort = asc ? 'asc' : 'desc';

      // Reset other headers
      this.parentElement.querySelectorAll('th').forEach(function(h) {
        if (h !== th) h.dataset.sort = '';
      });

      rows.sort(function(a, b) {
        var aText = (a.children[idx] || {}).textContent || '';
        var bText = (b.children[idx] || {}).textContent || '';
        return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
      });
      rows.forEach(function(row) { tbody.appendChild(row); });

      // Visual indicator
      this.querySelectorAll('.sort-icon').forEach(function(i) { i.remove(); });
      var icon = document.createElement('span');
      icon.className = 'sort-icon';
      icon.style.cssText = 'margin-left:4px;font-size:10px;';
      icon.textContent = asc ? '▲' : '▼';
      this.appendChild(icon);
    });
  });

  // ─── Search Filtering ──────────────────────────────────────
  document.querySelectorAll('input[type="text"][placeholder*="Search"]').forEach(function(searchInput) {
    searchInput.addEventListener('input', function() {
      var query = this.value.toLowerCase();
      var table = this.closest('.bg-white, [class*="rounded"]');
      if (!table) return;
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function(row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  });

  // ─── Password Toggle ──────────────────────────────────────
  document.querySelectorAll('input[type="password"]').forEach(function(input) {
    var toggle = input.parentElement.querySelector('button, .toggle-pw');
    if (toggle) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    }
  });

  // ─── Button Submit Feedback ────────────────────────────────
  document.querySelectorAll('button[class*="bg-green"], button[class*="bg-blue"]').forEach(function(btn) {
    if (btn.textContent.trim().match(/^(Submit|Sign In|Login|Register|Save|Create|Sign Up)$/i)) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        // Check required fields
        var form = this.closest('div[class*="space-y"], div[class*="rounded"]');
        if (!form) return;
        var inputs = form.querySelectorAll('input[required], input[type="email"], input[type="password"]');
        var valid = true;
        inputs.forEach(function(input) {
          input.dispatchEvent(new Event('blur'));
          if (!input.value.trim()) valid = false;
        });
        if (valid) {
          var orig = this.textContent;
          this.textContent = '✓ Success!';
          this.style.opacity = '0.7';
          this.disabled = true;
          var label = orig.trim().toLowerCase();
          if (/login|sign in|submit|register|sign up|create/i.test(label)) {
            setTimeout(function() {
              try { window.parent.postMessage({ type: 'prototype-nav', targetType: 'dashboard' }, '*'); } catch (e) {}
            }, 500);
          } else {
            setTimeout(function() {
              btn.textContent = orig;
              btn.style.opacity = '1';
              btn.disabled = false;
            }, 2000);
          }
        }
      });
    }
  });

  // ─── Select Dropdowns ─────────────────────────────────────
  document.querySelectorAll('select').forEach(function(select) {
    if (select.options.length <= 1) {
      // Add seeded options
      var options = ['Option A', 'Option B', 'Option C'];
      var label = select.closest('div')?.querySelector('label')?.textContent || '';
      if (label.toLowerCase().includes('country')) options = ['India', 'United States', 'United Kingdom', 'Australia', 'Canada'];
      else if (label.toLowerCase().includes('role')) options = ['Admin', 'Editor', 'Viewer', 'Manager'];
      else if (label.toLowerCase().includes('status')) options = ['Active', 'Inactive', 'Pending', 'Archived'];
      else if (label.toLowerCase().includes('type')) options = ['Standard', 'Premium', 'Enterprise', 'Free'];
      options.forEach(function(opt) {
        var o = document.createElement('option');
        o.value = opt.toLowerCase().replace(/\\s+/g, '_');
        o.textContent = opt;
        select.appendChild(o);
      });
    }
  });

  // ─── Checkbox Toggle ──────────────────────────────────────
  document.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    cb.style.cursor = 'pointer';
  });

  // ─── Inline Text Editing (contenteditable on [data-tp]) ───
  var EDIT_STYLE = document.createElement('style');
  EDIT_STYLE.textContent = '[data-tp]{outline:none;border-radius:3px;transition:box-shadow .15s;cursor:text}[data-tp]:hover{box-shadow:0 0 0 1px rgba(34,197,94,.45)}[data-tp]:focus{box-shadow:0 0 0 2px rgba(34,197,94,.7)}[data-tp][data-saving]::after{content:"saving…";margin-left:6px;font-size:10px;color:#16a34a;opacity:.7}[data-tp][data-saved]::after{content:"✓";margin-left:6px;color:#16a34a;opacity:.7}';
  document.head.appendChild(EDIT_STYLE);

  document.querySelectorAll('[data-tp]').forEach(function(el) {
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    var original = el.textContent;

    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.textContent = original; el.blur(); }
    });

    el.addEventListener('blur', function() {
      var next = (el.textContent || '').trim();
      if (!next || next === original) { el.textContent = original; return; }
      var path = el.getAttribute('data-tp');
      el.setAttribute('data-saving', '1');
      try {
        window.parent.postMessage({ type: 'prototype-edit', path: path, value: next }, '*');
      } catch(err) {}
      original = next;
    });
  });

  // Parent notifies us of save result
  window.addEventListener('message', function(ev) {
    var d = ev.data;
    if (!d || d.type !== 'prototype-edit-ack') return;
    document.querySelectorAll('[data-tp="' + d.path + '"]').forEach(function(el) {
      el.removeAttribute('data-saving');
      if (d.ok) {
        el.setAttribute('data-saved', '1');
        setTimeout(function(){ el.removeAttribute('data-saved'); }, 1200);
      }
    });
  });

})();
</script>`
}
