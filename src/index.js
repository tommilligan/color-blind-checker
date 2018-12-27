const chroma = require("chroma-js");
const blinder = require("color-blind");

function deltaEAverage(color0, color1) {
    return (
        (chroma.deltaE(color0, color1) + chroma.deltaE(color1, color0)) / 2.0
    );
}

class Checker {
    constructor(color0, color1) {
        this.color0 = chroma(color0);
        this.color1 = chroma(color1);
    }

    /**
     * Return a new Checker instance, with colors filtered using a deficiency
     * from the `color-blind` psmodule. Defaults to "achromatopsia"
     *
     * Available deficiencies: https://www.npmjs.com/package/color-blind
     */
    as(deficiency = "achromatopsia") {
        const deficiencyFilter = blinder[deficiency];
        return new Checker(
            deficiencyFilter(this.color0.hex()),
            deficiencyFilter(this.color1.hex())
        );
    }

    /**
     * Check this pair of colors against a range of color deficiencies
     */
    check() {
        const results = {
            filters: {},
            meta: {}
        };
        let total = 0.0;
        let count = 0;

        results.filters.trichromat = this.delta();
        for (const deficiency of Object.keys(blinder)) {
            const delta = this.as(deficiency).delta();
            total += delta;
            results.filters[deficiency] = delta;
            count += 1;
        }

        results.meta = {
            average: total / count,
            count,
            total
        };
        return results;
    }

    /**
     * Return the difference between the checker's two colors.
     */
    delta() {
        return deltaEAverage(this.color0, this.color1);
    }
}

module.exports = {
    deltaEAverage,
    Checker
};
