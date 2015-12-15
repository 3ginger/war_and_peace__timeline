var consts = require('./consts');

module.exports = {
    // fuzzy string comparasion
    compareStrings: function (strA,strB){
        for(var result = 0, i = strA.length; i--;){
            if(typeof strB[i] == 'undefined' || strA[i] == strB[i]);
            else if(strA[i].toLowerCase() == strB[i].toLowerCase())
                result++;
            else
                result += 4;
        }
        return 1 - (result + 4*Math.abs(strA.length - strB.length))/(2*(strA.length+strB.length));
    },


    // get uniq string

    getClientID: function () {
        return Math.random().toString(36).substring(10);
    },


    // convert an arabic digit ro a roman digit

    arabicToRoman: function(num) {
        num = parseInt(num, 10);

        if (num > 0 && num < 6000) {
            var mill = ['', 'M', 'MM', 'MMM', 'MMMM', 'MMMMM'],
                cent = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'],
                tens = ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'],
                ones = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
                m, c, t, r = function(n) {
                    n = (num - (num % n)) / n;
                    return n;
                };
            m = r(1000);
            num = num % 1000;
            c = r(100);
            num = num % 100;
            t = r(10);
            return mill[m] + cent[c] + tens[t] + ones[num % 10];
        } else {
            return 0;
        }
    },

    getChapters: function (chapters) {
        if (['нет', ''].indexOf(this.clearValue(chapters)) !== -1) {
            return [];
        }

        return _.chain(this.clearValue(chapters, true).replace(/[\.\,]$/g, '').split(/[\.\,]/g))
            .map(chapter => {
                var chapters = chapter.split('-');

                if (chapters.length == 1) {
                    return chapters[0];
                }

                return _.invoke(_.range(Number(chapters[0]), Number(chapters[1]) + 1), 'toString');
            })
            .flatten()
            .uniq()
            .value()
        ;
    },

    getHistoryPeriod: function (period) {
        var [month, year] = this.clearValue(period).split(' ');

        month = consts.monthNames.indexOf(month);

        return {
            history_period: {
                begin: new Date(year, month),
                end: new Date(year, month + 1, 1, 0, 0, 0, -1),
            },
            history_period_label: this.removeExessSpaces(period),
        };
    },

    // data trimmers

    removeSpaces: function (str) {
        return str.replace(/\s+/g, '');
    },

    removeExessSpaces: function (str) {
        return str.replace(/\s+/g, ' ').trim();
    },

    clearValue: function (str, force = false) {
        if (str) {
            str = str.toLowerCase();

            return force ? this.removeSpaces(str) : this.removeExessSpaces(str);
        }

        return str;
    },

    // visual helpers

    getTransformY: function (item) {
        var curTransform = item.attr('transform');

        return d3.transform(curTransform).translate[1];
    },

    // vpc helpers (volume, part, chapter)

    serializeVpcObject: function (obj) {
        var vol = obj.vol_id + 1,
            part = obj.part_id + 1,
            chapter = obj.chapter_id + 1;

        return vol + '' + part + '' + (chapter > 9 ? chapter : '0' + chapter);
    },

    deserializeVcpObject: function (str) {
        return {
            vol_id: parseInt(str.slice(0, 1)) - 1,
            part_id: parseInt(str.slice(1, 2)) - 1,
            chapter_id: parseInt(str.slice(2)) -1
        };
    },

    getOnlyVpcSignature: function (vpc) {
        return vpc ? {
            vol_id: vpc.vol_id,
            part_id: vpc.part_id,
            chapter_id: vpc.chapter_id,
        } : null;
    },

    getChapterByVpc: function (book, vpc) {
        return book[vpc.vol_id].parts[vpc.part_id].chapters[vpc.chapter_id];
    },

    getVpcObject: function (book, absoluteChapter) {
        for (var i = 0; i < book.length; i++) {
            var vol = book[i];
            var next_vol = book[i + 1] || {chaptersBefore: Number.MAX_VALUE};

            if (absoluteChapter >= vol.chaptersBefore && absoluteChapter < next_vol.chaptersBefore) {
                var vol_id = i;
                absoluteChapter -= vol.chaptersBefore;

                for (var j=0; j < vol.parts.length; j++) {
                    var part = vol.parts[j];
                    var next_part = vol.parts[j + 1] || {chaptersBefore: Number.MAX_VALUE};

                    if (absoluteChapter >= part.chaptersBefore && absoluteChapter < next_part.chaptersBefore) {
                        return part.chapters[absoluteChapter - part.chaptersBefore];
                    }
                }
            }
        }
    },

};