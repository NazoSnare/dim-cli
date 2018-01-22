/**
 * Part of the dimcoin/dim-cli package.
 *
 * NOTICE OF LICENSE
 *
 * Licensed under MIT License.
 *
 * This source file is subject to the MIT License that is
 * bundled with this package in the LICENSE file.
 *
 * @package    dimcoin/dim-cli
 * @author     DIMCoin Developers
 * @license    MIT License
 * @copyright  (c) 2018, DIMCoin Developers
 * @link       https://github.com/dimcoin/dim-cli
 */
"use strict";

import DIMParameters from "./dim-parameters";
import NEM from "nem-sdk";

/**
 * The DIMExplorer class provides an easy step into the DIM Ecosystem's
 * shared informations.
 * 
 * The explorer can be used to retrieve important information when working
 * with DIM.
 * 
 * All methods in the DIMExplorer return Promises. This means that you will
 * use then-chains rather than callbacks when working with the Explorer class.
 * 
 * @example Instantiate the DIMExplorer class
 * 
 * ```javascript
 *     import NIS from "./scripts/api"; 
 *     let api = new NIS();
 *     api.init({network: "mainnet"});
 * 
 *     let explorer = new DIMExplorer(api);
 * 
 *     // Now use the explorer..
 *     this.getCurrency("dim:coin").then((parameters) => { console.log(parameters); });
 * 
 *     // OR..
 *     this.getTotalHoldersShareLevyAmount()
 *         .then((amount) => { console.log(amount); })
 *         .catch((err) => console.error(err));
 * ```
 *
 */
class DIMExplorer {

    /**
     * Construct the Formatter object
     */
    constructor(NIS) {
        /**
         * The DIM Ecosystem Parameters.
         *
         * @var {DIMParameters}
         */
        this.parameters = new DIMParameters();

        /**
         * The NIS API Wrapper instance.
         *
         * @var {Object}
         */
        this.api = NIS;
    }

    /**
     * This helper method retrieves dim currencies data on the NEM
     * blockchain network.
     *
     * @param {String} currency     Fully qualified mosaic name (dim:coin, dim:token, etc.)
     * @return {Object|null}
     */
    async getCurrency(currency) {

        if (this.mosaicParameters.hasOwnProperty(currency)) {
            return this.mosaicParameters[currency];
        }

        let ns = currency.replace(/(.*):(.*)/, "$1");
        let mos = currency.replace(/(.*):(.*)/, "$2");

        // request MosaicDefinition from NIS
        let response = await this.api.SDK.com.requests
                                 .namespace.mosaicDefinitions(this.api.node, ns);

        let definitions = response.data || [];
        for (let d = 0; d < definitions.length; d++) {
            let s = this.api.SDK.utils.format.mosaicIdToName(definitions[d].id);
            if (s !== currency) continue;

            let params = this.parameters.fromMosaicDefinition(definitions[d]);
            return (this.parameters.mosaicParameters[currency] = params);
        }

        return null;
    }

    /**
     * This helper method lets you retireve the *Total Available Levy*
     * amount from the Levy recipient account.
     *
     * The Total Available Levy represents 30% of the available network
     * fees.
     *
     * @return {Integer}
     */
    async getTotalHoldersShareLevyAmount() {
        let self = this;

        // get 100% of network fees
        let hundredPercentLevyAmount = await this.getTotalAvailableLevyAmount();

        // now calculate 30 %
        let thirtyPercentLevyAmount = Math.ceil(0.3 * hundredPercentLevyAmount);
        return thirtyPercentLevyAmount;
    }

    /**
     * This helper method lets you retrieve the *Total Available Levy*
     * amount from the Levy recipient account.
     *
     * The Total Available Levy represents 100% of the available network
     * fees.
     *
     * @return {Integer}
     */
    async getTotalAvailableLevyAmount() {
        let self = this;
        let address = self.parameters.mosaicParameters["dim:coin"].levy.recipient;

        // fetch Total balance from Levy Account
        let response = await this.api.SDK.com.requests
                                 .account.mosaics.owned(self.api.node, address);

        let mosaics = response.data || [];
        for (let b = 0; b < mosaics.length; b++) {
            let s = NEM.utils.format.mosaicIdToName(mosaics[b].mosaicId);
            if (s !== "dim:coin") continue;

            return mosaics[b].quantity;
        }

        return 0;
    }

    /**
     * This helper method lets you retrieve the *Total Circulating Supply*
     * of the said dim currency.
     * 
     * @param   {String}    currency    Mosaic name (dim:coin, dim:token, dim:eur, etc..)
     * @return  {Integer}   The first argument to the promise is the total circulating supply.
     */
    async getTotalCirculatingSupply(currency) {
        let self = this;
        let creator = self.parameters.getCoin().creator;
        let address = self.api.SDK.model.address.toAddress(creator, self.api.networkId);

        let parameters = await this.getCurrency(currency);
        if (!parameters)
            return 0;

        return parameters.totalSupply;
    }

}

exports.DIMExplorer = DIMExplorer;
export default DIMExplorer;
