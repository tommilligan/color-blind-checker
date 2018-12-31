const chalk = require("chalk");
const chroma = require("chroma-js");
const blinder = require("color-blind");

DEFAULT_TESTS = {
    // colors worse relative to full color vision
    informationLoss: {
        description: "Colors are much closer than full color vision",
        evaluate: function(stats) {
            return stats.relative.ratio >= 5.0;
        }
    },
    // colors bad as absolute measure
    indistinguishable: {
        description: "Colors are functionally indistinguishable",
        evaluate: function(stats) {
            return stats.absolute.distance <= 2.0;
        }
    },
    // colors unreadable as text and background
    textContrast: {
        description: "Colors are unreadable as text/background",
        evaluate: function(stats) {
            return stats.absolute.contrast < 4.5;
        }
    }
};

DEFAULT_OPTIONS = {
    // by default, check everything color-blind can handle
    deficiencies: Array.from(Object.keys(blinder)),
    // raise an exception on the first issue encountered (useful for testing)
    failFast: false,
    // check contrast for text readability
    skipTests: []
};

/**
 * Return a block of chalk color for friendly terminal messaging
 */
function blockOf(color) {
    return chalk.bgHex(color)("  ");
}

/**
 * Takes two chroma color objects and returns the average deltaE distance
 * between them (symmetrical metric)
 */
function deltaEAverage(color0, color1) {
    return (
        (chroma.deltaE(color0, color1) + chroma.deltaE(color1, color0)) / 2.0
    );
}

function warningsFromStats(stats, testIds) {
    const results = {};
    testIds.forEach(function(testId) {
        const test = DEFAULT_TESTS[testId];
        const fail = test.evaluate(stats);
        results[testId] = {
            description: test.description,
            fail
        };
    });
    return results;
}

/**
 * Display a pair of colored terminal blocks for this pair
 */
function blocks(colors) {
    return colors.map(blockOf).join("");
}

/**
 * Responsible for handling pairs of colors
 */
class Checker {
    constructor(color0, color1, options) {
        // stored as chroma colors
        this.colors = [chroma(color0), chroma(color1)];
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);

        this.statsAbsolute = {
            colors: this._colorsHex(),
            contrast: chroma.contrast(...this.colors),
            distance: deltaEAverage(...this.colors)
        };

        // pre-calculate which tests we care about
        const skipTestKeys = {};
        this.options.skipTests.forEach(function(testId) {
            skipTestKeys[testId] = true;
        });
        this._testIds = [];
        for (const testId of Object.keys(DEFAULT_TESTS)) {
            if (!(testId in skipTestKeys)) {
                this._testIds.push(testId);
            }
        }
    }

    /**
     * Returns current colors as hex values
     */
    _colorsHex() {
        return this.colors.map(function(color) {
            return color.hex();
        });
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
     * Taking this pairing as full color visison,
     * check against a range of color deficiencies
     */
    check() {
        const result = {
            filters: {},
            meta: {}
        };
        let total = 0.0;
        let count = 0;

        // get result for the unfiltered pair of colors
        const stats = {
            absolute: this.statsAbsolute,
            relative: {
                ratio: 1.0
            }
        };
        result.filters.trichromat = {
            colors: this.colors,
            stats,
            warnings: warningsFromStats(stats, this._testIds)
        };

        // get result for each color deficient pair
        for (const deficiency of this.options.deficiencies) {
            const deficiencyChecker = this.as(deficiency);
            const stats = {
                absolute: deficiencyChecker.statsAbsolute,
                relative: {
                    ratio:
                        result.filters.trichromat.distance /
                        deficiencyChecker.statsAbsolute.distance
                }
            };

            result.filters[deficiency] = {
                colors: deficiencyChecker.colors,
                stats,
                warnings: warningsFromStats(stats, this._testIds)
            };
            total += stats.absolute.distance;
            count += 1;
        }

        if (this.options.failFast) {
            for (const filterId of Object.keys(result.filters)) {
                const filter = result.filters[filterId];
                for (const testId of Object.keys(filter.warnings)) {
                    const warning = filter.warnings[testId];
                    if (warning.fail) {
                        throw new Error(
                            `${filterId} (${blocks(this.colors)} -> ${blocks(
                                filter.stats.absolute.colors
                            )}}): ${DEFAULT_TESTS[testId].description}`
                        );
                    }
                }
            }
        }

        result.meta = {
            average: total / count,
            count,
            total
        };
        result.options = this.options;
        return result;
    }

    /**
     * Returns a sample text block showing color comparison
     */
    sample() {
        return chalk.hex(this.colors[0]).bgHex(this.colors[1])("sample");
    }
}

async function checkElement(element, options) {
    const textColor = await element.getCssProperty("color");
    const backgroundColor = await element.getCssProperty("background-color");
    return new Checker(
        textColor.parsed.hex,
        backgroundColor.parsed.hex,
        options
    ).check();
}

module.exports = {
    blocks,
    deltaEAverage,
    Checker,
    checkElement
};
