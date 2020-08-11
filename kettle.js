const request = require('request-json');
const url = require('url');
const puppeteer = require('puppeteer');

const user = process.env.KETTLE_USERNAME;
const password = process.env.KETTLE_PASSWORD;

const LOGIN_URL = 'https://www.kettlebellkings.com/login.php';
const STOCK_URL = 'https://www.kettlebellkings.com/competition-kettlebell/';
const IFRAME_OVERLAY = '#attentive_overlay';
const SELECT_SELECTOR = '#attribute_select_888';
const OPTIONS_SELECTOR = '#attribute_select_888 > option';

const showBrowser = !!process.argv[2];
const options = showBrowser
  ? {
      headless: false,
      slowMo: 20,
    }
  : {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

const TILL_URL = url.parse(process.env.TILL_URL);
const TILL_BASE = TILL_URL.protocol + '//' + TILL_URL.host;
let TILL_PATH = TILL_URL.pathname;
const TILL_PHONE = process.env.TILL_PHONE;

if (TILL_URL.query != null) {
  TILL_PATH += '?' + TILL_URL.query;
}

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const getTextContent = (el) => el.textContent;

const getTextFromHandles = async (page, handles) => {
  let text = [];
  await asyncForEach(handles, async (handle, index) => {
    if (index === 0) {
      return;
    }
    text[index - 1] = await page.evaluate(getTextContent, handle);
  });
  return text;
};

async function init() {
  const browser = await puppeteer.launch(options);

  try {
    let response;
    const page = await browser.newPage();

    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    response = await login(page);
    if (response.error) {
      throw new Error(response.error);
    }

    await page.goto(STOCK_URL, { waitUntil: 'networkidle2' });
    response = await checkStock(page);
    if (response.error) {
      throw new Error(response.error);
    }

    await browser.close();
  } catch (e) {
    console.error(e);
  }
}

async function login(page) {
  try {
    await page.waitForSelector(IFRAME_OVERLAY);
    await page.$eval(IFRAME_OVERLAY, (overlay) => {
      overlay.remove();
    });

    await page.waitForSelector('#login_email');
    await page.click('#login_email');
    await page.keyboard.type(user);

    await page.click('#login_pass');
    await page.keyboard.type(password);

    const navigate = page.waitForNavigation({
      waitUntil: 'networkidle2',
    });
    page.click(
      'body > div.body > div.container > div > div > form > div.form-actions > input'
    );
    await navigate;
    return {};
  } catch (error) {
    return { error };
  }
}

async function checkStock(page) {
  try {
    let response = {};

    await page.waitForSelector(SELECT_SELECTOR);
    const options = await page.$$(OPTIONS_SELECTOR);
    const optionsText = await getTextFromHandles(page, options);
    const inStock = optionsText.map((text) => !text.includes('Out of Stock'));

    const twelve = inStock[2];
    const sixteen = inStock[4];

    if (twelve || sixteen) {
      await inform();
    }
    if (twelve) {
      response = await addToCart(page, '2199');
    } else if (sixteen) {
      response = await addToCart(page, '2201');
    }

    return response;
  } catch (error) {
    return { error };
  }
}

async function inform() {
  return request.createClient(TILL_BASE).post(
    TILL_PATH,
    {
      phone: [TILL_PHONE],
      text:
        'Kettle Bell in STOCK!\nhttps://www.kettlebellkings.com/competition-kettlebell/',
    },
    function (err, res) {
      return console.log(res.statusCode);
    }
  );
}
async function addToCart(page, value) {
  try {
    await page.select(SELECT_SELECTOR, value);
    await page.click('#form-action-addToCart');

    return {};
  } catch (e) {
    console.error('trouble with select');
    return { error: 'trouble with select' };
  }
}

init();
