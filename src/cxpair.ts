const currencies = ['USD', 'ETC', 'BTC', 'LTC'];

/**
 * A cryptocurrency exchange pair.
 */
class CxPair {

    /**
     * Establishes a new cryptocurrency exchange pair.
     * @param {Number} buyCurrency  The currency to acquire.
     * @param {Number} sellCurrency The currency to unload.
     */
    constructor(buyCurrency, sellCurrency) {
        const buyCurrencyUc = buyCurrency.toUpperCase();
        const sellCurrencyUc = sellCurrency.toUpperCase();

        if ( ! buyCurrencyUc in currencies)
            throw new Error(`Unrecognised buy currency '${buyCurrencyUc}'`);
        if ( ! sellCurrencyUc in currencies)
            throw new Error(`Unrecognised buy currency '${sellCurrencyUc}'`);

        if (buyCurrencyUc === sellCurrencyUc)
            throw new Error(`Buy currency and sell currency both ${buyCurrencyUc}`);

        this.buyCurrencyStr = buyCurrencyUc;
        this.sellCurrencyStr = sellCurrencyUc;
    }

    buyCurrency() {
        return this.buyCurrencyStr;
    }

    sellCurrency() {
        return this.sellCurrencyStr;
    }

}

module.exports = CxPair;