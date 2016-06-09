
let buttons = new Map();
let container = document.getElementById('navbar-extensions');
let channel = new BroadcastChannel('browserAction');
channel.onmessage = function ({data}) {
  let options = data.options;
  let button = buttons.get(options.id);

  switch (data.action) {
    case 'shutdown':
      button && button.remove();
      break;

    case 'update':
      if (!button) {
        button = createButton(options);
        buttons.set(options.id, button);
      }
    
      updateTitle(options);
      updateBadge(options);
      updateIcon(options);
      break;

    case 'openPopup':
      openPopup(options);
      break;

    default:
      throw new Error(data.action + ' is not implemented.');
      break;
  }
};


function createButton(options) {
  let element = document.createElement('button');
  element.className = 'extension-button';
  element.addEventListener("click", function() {
    if (options.panel) {
      Panels.toggle(options);
    } else {
      channel.postMessage({ event: 'click', buttonId: options.id });
    }
  });

  container.appendChild(element); 
  return element;
}

function updateTitle(options) {
  let button = buttons.get(options.id);
  button.setAttribute('title', options.title || '');
}

function updateBadge(options) {
  let button = buttons.get(options.id);

  let badge = button.querySelector('.button-badge');
  if (!options.badgeText && !badge) {
    return;
  }

  if (!options.badgeText && badge) {
    badge.remove();
    return;
  }

  if (options.badgeText && !badge) {
    let badge = document.createElement('div');
    badge.className = 'button-badge';
    badge.setAttribute('style', 'position: absolute; bottom: 0; right: 0px; border: 1px solid black; border-radius: 5px;');
    button.appendChild(badge);
  }

  badge.textContent = options.badgeText;
  badge.style.backgroundColor = options.badgeBackgroundColor || '#e0e0e0';
}

function updateIcon(options) {
  let button = buttons.get(options.id);

  if (options.icon) {
    button.innerHTML = '<img src="' + options.icon[Object.keys(options.icon)[0]] + '" />';
  } else {
    button.innerHTMl = '';
  }
}

function openPopup(options) {
  let button = buttons.get(options.id);
}

