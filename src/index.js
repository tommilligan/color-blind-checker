const chroma = require("chroma-js");
const blinder = require("color-blind");

/**
 * Takes two chroma color objects and returns the average deltaE distance
 * between them (symmetrical metric)
 */
function deltaEAverage(color0, color1) {
    return (
        (chroma.deltaE(color0, color1) + chroma.deltaE(color1, color0)) / 2.0
    );
}

/**
 * Calculate warnings based on absolute distance and ratio to normal
 */
function calculateWarnings({ ratio, distance, contrast }) {
    return {
        informationLoss: ratio >= 5.0,
        indistinguishable: distance <= 2.0,
        lowContrast: contrast < 4.5
    };
}

/**
 * Responsible for handling pairs of colors
 */
class Checker {
    constructor(color0, color1) {
        this.colors = [chroma(color0), chroma(color1)];
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
            deficiencyFilter(this.colors[0].hex()),
            deficiencyFilter(this.colors[1].hex())
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

        // get results for the unfiltered pair of colors
        results.filters.trichromat = {
            colors: this.colorsHex(),
            contrast: this.contrast(),
            distance: this.delta(),
            ratio: 1.0
        };
        results.filters.trichromat.warnings = calculateWarnings(
            results.filters.trichromat
        );
        // get results for each color deficient pair
        for (const deficiency of Object.keys(blinder)) {
            const deficiencyChecker = this.as(deficiency);
            const delta = deficiencyChecker.delta();
            results.filters[deficiency] = {
                colors: deficiencyChecker.colorsHex(),
                contrast: deficiencyChecker.contrast(),
                distance: delta,
                ratio: results.filters.trichromat.distance / delta
            };
            results.filters[deficiency].warnings = calculateWarnings(
                results.filters[deficiency]
            );
            total += delta;
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
     * Returns current colors as hex values
     */
    colorsHex() {
        return this.colors.map(function(color) {
            return color.hex();
        });
    }

    contrast() {
        return chroma.contrast(...this.colors);
    }

    /**
     * Return the difference between the checker's two colors.
     */
    delta() {
        return deltaEAverage(...this.colors);
    }
}

module.exports = {
    deltaEAverage,
    Checker
};
