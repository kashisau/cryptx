const ws = require('ws');
const request = require('request')
const crypto = require('crypto')

const BF_V2_SOCKET = 'wss://api.bitfinex.com/ws/2';
const TRADE_BASE_URL = 'https://api.bitfinex.com';
const TRADE_URL_PATH = '/v1/order/new';

/**
 * Subscribes to the BitFinex trade watcher service, authoring trade orders
 * based on fixed price targets.
 */
class CxWorker {

    /**
     * Creates a new Currency conversion bot.
     * @param {CxPair} cxpair       The currency pair to trade.
     * @param {Number} buyPrice     The minimum threshold to issue a buy command.
     * @param {Number} sellPrice    The minimum threshold to issue a sell command.
     * @param {Number} quantity     The quantity of the currency to trade.
     * @param {function} messages   A message channel.
     */
    constructor(cxpair, buyPrice, sellPrice, quantity, messages) {
        this.cxPair = cxpair;

        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
        this.quantity = quantity;

        this.buyIntent = false;
        this.sellIntent = false;

        this.holding = false;

        this.lastTick = undefined;
        this.messages = messages;

        this.apiKey = process.env.BFX_API_KEY;
        this.apiKeySecret = process.env.BFX_API_KEY_SECRET;

        if ( ! this.apiKey) throw new Error("Missing API Key");
        if ( ! this.apiKeySecret) throw new Error("Missing API Key Secret");

        this.watchTicker();
    }

    watchTicker(messages) {
        const w = new ws(BF_V2_SOCKET)

        w.on('message', (res) => {
            const msg = JSON.parse(res);

            if ( ! Array.isArray(msg))
                return console.log(msg);
            
            const data = msg.pop();
                if (data === "hb") return;
            
            const tick = {
                bid: data[0],
                bidSize: data[1],
                ask: data[2],
                askSize: data[3],
                dailyChange: data[4],
                dailyChangePercent: data[5],
                lastPrice: data[6],
                volume: data[7],
                high: data[8],
                low: data[9]
            };
            
            this.updateTick(tick);
        });

        let msg = JSON.stringify({ 
            event: 'subscribe', 
            channel: 'ticker', 
            symbol: `t${this.cxPair.buyCurrency()}${this.cxPair.sellCurrency()}` 
        })

        w.on('open', () => w.send(msg))
    }

    updateTick(tick) {
        if (this.buyPrice > tick.lastPrice)
            if ( ! this.buyIntent)
                if ( ! this.holding) {
                    this.emit(`Preparing to buy ${this.cxPair.buyCurrency()}`);
                    this.buyIntent = true;
                }
            
        if (this.sellPrice < tick.lastPrice)
            if ( ! this.sellIntent)
                if (this.holding) {
                    this.emit(`Preparing to sell ${this.cxPair.sellCurrency()}`);
                    this.sellIntent = true;
                }

        this.buy(tick);
        this.sell(tick);

        this.lastTick = tick;

        this.emit(`${this.cxPair.buyCurrency()}: $${tick.lastPrice}`);
    }


    emit() {
        this.messages(arguments[0]);
    }

    makeOrder(type, price) {
        const nonce = Date.now().toString();
        const completeURL = TRADE_BASE_URL + TRADE_URL_PATH;
        const body = {
            request: TRADE_URL_PATH,
            symbol: `${this.cxPair.buyCurrency()}${this.cxPair.sellCurrency()}`,
            amount: this.quantity.toFixed(6),
            price: price.toFixed(2),
            side: type,
            type: "limit",
            ocoorder: false,
            nonce
        }

        const payload = new Buffer(JSON.stringify(body))
            .toString('base64')

        const signature = crypto
            .createHmac('sha384', this.apiKeySecret)
            .update(payload)
            .digest('hex')

        const options = {
            url: completeURL,
            headers: {
                'X-BFX-APIKEY': this.apiKey,
                'X-BFX-PAYLOAD': payload,
                'X-BFX-SIGNATURE': signature
            }
        };

        return request.post(
            options,
            function(error, response, body) {
                console.log('response:', JSON.stringify(body, 0, 2))
            }
        );
    }

    buy(tick) {
        if ( ! this.buyIntent) return;
        if (this.holding) {
            this.emit(`Buy order attempted while holding.`);
        }
        const last = this.lastTick;
        if (typeof last !== "undefined"
            && last.lastPrice > tick.ask) return;

        this.buyIntent = false;
        this.holding = true;

        this.emit(`Buying ${this.quantity} ${this.cxPair.buyCurrency()} for ${tick.bid}`);

        this.makeOrder("buy", tick.ask);
    }
    
    sell(tick) {
        if ( ! this.sellIntent) return;
        if ( ! this.holding) {
            this.emit(`Sell order attempted with no holdings.`);
        }
        const last = this.lastTick;
        if (typeof last !== "undefined"
            && last.lastPrice < tick.bid) return;

        this.sellIntent = false;
        this.holding = false;
        this.emit(`Selling ${this.quantity} ${this.cxPair.buyCurrency()} for ${tick.bid}`);

        this.makeOrder("sell", tick.bid);
    }

}

module.exports = CxWorker;