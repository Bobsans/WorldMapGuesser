export function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function secondsToTime(seconds) {
    let sec = seconds % 60;
    let min = Math.floor(seconds / 60) % 60;
    let hrs = Math.floor(seconds / (60 * 60)) % 60;
    let dys = Math.floor(seconds / (60 * 60 * 60)) % 60;
    let secstr = `${sec.toString().padStart(2, '0')}`;
    let minstr = `${min.toString().padStart(2, '0')}:`;
    let hrsstr = hrs ? `${hrs.toString().padStart(2, '0')}:` : '';
    let dysstr = dys ? `${dys.toString().padStart(2, '0')}:` : '';

    return `${dysstr}${hrsstr}${minstr}${secstr}`;
}

export function livesRender(count) {
    let output = '';
    for (let i = 0; i < 3; i++) {
        output += `<i${i < count ? ' class="active"' : ''}>&hearts;</i>`;
    }
    return output;
}

export function createElement(name, attrs = {}, children = []) {
    let el = document.createElement(name);
    for (let [key, val] of Object.entries(attrs)) {
        switch (key) {
            case 'class':
                el.classList.add(...(Array.isArray(val) ? val : val.split(' ')));
                break;
            case 'text':
                el.innerText = val;
                break;
            default:
                el.setAttribute(key, val);
        }

        el.attributes[key] = val;
    }
    for (let child of children) {
        el.appendChild(child);
    }
    return el;
}
