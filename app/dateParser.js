var consts = require('./consts');
var util = require('./util');

var datePartFuncs = {
    checks: {
        month: (v) => {
            if (consts.monthNames.indexOf(v) === -1) {
                console.log('не найден:', v);
            }
        },

        changedMonth: (v) => {
            if (consts.monthChangedNames.indexOf(v) === -1) {
                console.log('не найден:', v);
            }
        },
    },

    tests: {
        testDate: (v) => !!this.dateFormat.parse(v),

        testDay: (v) => !Number.isNaN(parseInt(v)),

        testYear: (v) => parseInt(v) > 1000,

        testTextMonth: (v) => consts.monthChangedNames.indexOf(v) !== -1 || consts.monthNames.indexOf(v) !== -1,

        testSeason: (v) => consts.seasonChangedNames.indexOf(v) !== -1 || consts.seasonNames.indexOf(v) !== -1,

        testPart: (v) => consts.relationParts.indexOf(v) !== -1,

        testLimit: (v) => v === 'пределы',
    },

    gets: {
        getPart: (v) => consts.relationParts.indexOf(v)/(consts.relationParts.length - 1),

        getMonth: (v) => {
            var index = consts.monthChangedNames.indexOf(v);
            if (index !== -1) {
                return index;
            }

            index = consts.monthNames.indexOf(v);
            if (index !== -1) {
                return index;
            }
        },

        getDay: (v) => parseInt(v),

        getYear: (v) => parseInt(v),

        getSeason: (v) => {
            var index = consts.seasonChangedNames.indexOf(v);
            if (index !== -1) {
                return index;
            }

            index = consts.seasonNames.indexOf(v);
            if (index !== -1) {
                return index;
            }
        },

        getSeasonBeginMonth: (v) => datePartFuncs.gets.getSeason(v) * 3 - 1,
    },

    patterns: {
        "42": (parts, year) => {
            let month = consts.monthChangedNames.indexOf(parts[1]);
            let day = datePartFuncs.gets.getDay(parts[0]);

            return new Date(year, month, day);
        },
        "02": (parts, year) => {
            let month = datePartFuncs.gets.getMonth(parts[1]);
            let day = Math.floor(datePartFuncs.gets.getPart(parts[0]) * (consts.numDaysInMonth[month] - 1) + 1); 

            return new Date(year, month, day);
        },
        "13": (parts) => {
            let year = datePartFuncs.gets.getYear(parts[1]);
            let month = datePartFuncs.gets.getSeasonBeginMonth(parts[0]);

            return {
                begin: new Date(year, month),
                end: new Date(year, month + 3)
            };
        },
        "01": (parts, year) => {
            year = datePartFuncs.gets.getYear(year) + 1;
            let monthOffset = Math.floor(datePartFuncs.gets.getPart(parts[0]) * 3);
            let month = datePartFuncs.gets.getSeasonBeginMonth(parts[1]) + monthOffset;

            return {
                begin: new Date(year, month),
                end: new Date(year, month + 1)
            };
        },
        "23": (parts) => {
            let year = datePartFuncs.gets.getYear(parts[1]);
            let month = datePartFuncs.gets.getMonth(parts[0]);

            return {
                begin: new Date(year, month),
                end: new Date(year, month + 1)
            };
        },
        "442": (parts, year) => {
            let dayStart = datePartFuncs.gets.getDay(parts[0]);
            let dayEnd = datePartFuncs.gets.getDay(parts[1]);
            let month = datePartFuncs.gets.getMonth(parts[2]);

            return {
                begin: new Date(year, month, dayStart),
                end: new Date(year, month, dayEnd)
            };
        },
        "023": (parts) => {
            let year = datePartFuncs.gets.getYear(parts[2])
            let month = datePartFuncs.gets.getMonth(parts[1]);
            let day = Math.floor(datePartFuncs.gets.getPart(parts[0]) * consts.numDaysInMonth[month]); 

            return new Date(year, month, day);
        },
        "4242": (parts, year) => {
            let dayStart = datePartFuncs.gets.getDay(parts[0]);
            let monthStart = datePartFuncs.gets.getMonth(parts[1]);
            let dayEnd = datePartFuncs.gets.getDay(parts[2]);
            let monthEnd = datePartFuncs.gets.getMonth(parts[3]);

            return {
                begin: new Date(year, monthStart, dayStart),
                end: new Date(year, monthEnd, dayEnd)
            };
        },
        "42423": (parts) => {
            let dayStart = datePartFuncs.gets.getDay(parts[0]);
            let monthStart = datePartFuncs.gets.getMonth(parts[1]);
            let dayEnd = datePartFuncs.gets.getDay(parts[2]);
            let monthEnd = datePartFuncs.gets.getMonth(parts[3]);
            let year = datePartFuncs.gets.getYear(parts[4]);

            return {
                begin: new Date(year, monthStart, dayStart),
                end: new Date(year, monthEnd, dayEnd)
            };
        },
        "423423": (parts) => {
            let dayStart = datePartFuncs.gets.getDay(parts[0]);
            let monthStart = datePartFuncs.gets.getMonth(parts[1]);
            let yearStart = datePartFuncs.gets.getYear(parts[2]);
            let dayEnd = datePartFuncs.gets.getDay(parts[3]);
            let monthEnd = datePartFuncs.gets.getMonth(parts[4]);
            let yearEnd = datePartFuncs.gets.getYear(parts[5]);

            return {
                begin: new Date(yearStart, monthStart, dayStart),
                end: new Date(yearEnd, monthEnd, dayEnd)
            };
        },
        "33": (parts) => {
            let yearStart = datePartFuncs.gets.getYear(parts[0]);
            let yearEnd = datePartFuncs.gets.getYear(parts[1]);

            return {
                begin: new Date(yearStart, 0),
                end: new Date(yearEnd, 0)
            };
        },
        "235": (parts) => {
            let month = datePartFuncs.gets.getMonth(parts[0]);
            let year = datePartFuncs.gets.getYear(parts[1])

            return {
                begin: new Date(year, month),
                end: new Date(1820, 0)
            };
        }
    },

    getPatternId: (v) => {
        for (var i in datePartTests) {
            if (datePartTests[i].fn(v)) {
                return datePartTests[i].id;
            }
        }

        return '9';
    },

    dateFormat: d3.time.format("%d.%m.%Y"),

    getDate: function (v) {
        var date = this.dateFormat.parse(util.clearValue(v, true));

        if (!date) {
            console.log('не верная дата:', v);
        }

        return date;
    },

    convertDate: function (date, year) {
        date = util.clearValue(date);
        if (['нет', ''].indexOf(date) !== -1) {
            return null;
        }

        if (this.tests.testDate(date)) {
            return this.getDate(date);
        }

        var dateParts = _.without(date
            .split(/[\s-]/g), 'с', 'по', 'и', 'за', 'романа');
        var patternId = '';

        for (var key in dateParts) {
            patternId += this.getPatternId(dateParts[key]);
        }

        if (this.patterns[patternId]) {
            return this.patterns[patternId](dateParts, year);
        }
    },

};

var datePartTests = datePartFuncs.testSequence = [
    {fn: datePartFuncs.tests.testPart, id: '0'},
    {fn: datePartFuncs.tests.testSeason, id: '1'},
    {fn: datePartFuncs.tests.testTextMonth, id: '2'},
    {fn: datePartFuncs.tests.testYear, id: '3'},
    {fn: datePartFuncs.tests.testDay, id: '4'},
    {fn: datePartFuncs.tests.testLimit, id: '5'},
];

module.exports = datePartFuncs;
