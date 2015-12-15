'use strict';

// CSS
require('normalize.css');
require('./app.styl');

require('underscore');
require('d3');
var util = require('./util');
var consts = require('./consts');
var dateParser = require('./dateParser');

var pathFn = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate("linear");

var timeScale = d3.time.scale();

var bookStructure = [],
    prevBookOffset = 0,
    prevHistoryOffset = 0,
    timelineScroll = 0,
    currentEvent,
    currentEventIndex,
    prevYear
;

var fileLoaders = [loadData, loadChapters, loadUrls],
    remaindFiles = fileLoaders.length,
    timelineData,
    filteredTimelineData,
    historyFilteredTimelineData,
    dataByType,
    dataLinks,
    dataUrls,
    dataChapters,
    totalParts,
    totalChapters,
    yearsData
;


// visual consts

const WIDTH_CHAPTER = 40;
const HEIGHT_CHAPTER = 20;
const BOOK_TIMELINE_PAD = 35;
const YEAR_TIMELINE_PAD = 5;
const EVENT_POINT_SIZE = 7;
const POINT_OFFSET = EVENT_POINT_SIZE/2;
const EVENT_WRAPPER_POINT_SIZE = 70;
const WRAPPER_POINT_OFFSET = EVENT_WRAPPER_POINT_SIZE/2;
const CONTENT_BOTTOM_OFFSET = 100;
const TIMELINE_FONT_SIZE = 11;
const YEAR_FONT_SIZE = 90*0.75;
const ACTIVE_YEAR_FONT_SIZE = 220*0.75;
const DATES_X1 = WIDTH_CHAPTER + YEAR_TIMELINE_PAD;
const DATES_X2 = DATES_X1 + WIDTH_CHAPTER;
const DATE_POINTS_X = DATES_X1 + EVENT_POINT_SIZE;
const MIN_DATE_POINTS_OFFSET = 5;
const GRID_X1 = WIDTH_CHAPTER + YEAR_TIMELINE_PAD;
const SCROLL_SIZE = 10000;
const EDGE_ACTIVE_POIN_OFFSET = 195;
const PART_LINE_OFFSET = 3;
const TIMELINE_DURATION = 800;
const CHANGE_EVENT_DURATION = 300;
const LONG_CHANGE_EVENT_DURATION = CHANGE_EVENT_DURATION * 2;
var BOOK_X1;

var timelineWidth,
    timelineHeight,
    timelineOverflowHeight,
    timelineOverflowCenter
;

var timelineView = d3.select('#timeline .wrapper .svg-timeline'),
    timelineYearsView = d3.select('#timeline .wrapper .svg-timeline-years'),
    yearInTimelineView = timelineView.select('.year-timeline .years'),
    yearTimelineView = timelineYearsView.select('.year-timeline .years'),
    bookTimelineView = timelineView.select('.book-timeline'),
    historyWrapperView = d3.select('#history .wrapper'),
    bookWrapperView = d3.select('#book .wrapper'),
    volNameView = d3.select('.vol-name'),
    partNameView = d3.select('.part-name'),
    headerView = d3.select('.vand-header'),
    contentWrapperView = d3.selectAll('.vand-main'),
    contentView = d3.select('#content'),
    contentPartViews = d3.selectAll('.vand-main__part'),
    watermarkVolView = d3.select('.watermark__vol'),
    watermarkPartView = d3.select('.watermark__part'),
    historyGroupView = d3.select('.history-group'),
    shadowLinkViews,
    shadowLinksView = d3.select('.shadow-event-links .links'),
    gridLinkViews,
    gridView = timelineView.select('.grid-links .links'),
    linksView = timelineView.select('.event-links .links'),
    datePointViews,
    datePointTextViews,
    hideEventTextsBtn = d3.select('.hide-date-point-texts'),
    showEventTextsBtn = d3.select('.show-date-point-texts'),
    changePrevEventBtn = d3.select('.scroll-chapter-up'),
    changeNextEventBtn = d3.select('.scroll-chapter-down')
;


// add interaction to navigate controls

changePrevEventBtn.on('click', function() {
    changeEvent(currentEventIndex - 1);
});

changeNextEventBtn.on('click', function() {
    changeEvent(currentEventIndex + 1);
});

hideEventTextsBtn.on('click', function() {
    hideEventTextsBtn.classed('hidden', true);
    showEventTextsBtn.classed('hidden', false);
    datePointTextViews.classed('hidden', true);
});

showEventTextsBtn.on('click', function() {
    showEventTextsBtn.classed('hidden', true);
    hideEventTextsBtn.classed('hidden', false);
    datePointTextViews.classed('hidden', false);
});


// change a timeline's event

function changeEvent(index) {
    var lastEventIndex = filteredTimelineData.length - 1;
    index = index < 0 ? lastEventIndex + (index % lastEventIndex + 1) : index;
    index = index > lastEventIndex ? (index % lastEventIndex - 1) : index;

    if (index !== currentEventIndex) {
        changeEventByData(filteredTimelineData[index]);
    }
}

function changeEventByURLID(urlSiteId) {
    var event = _.findWhere(filteredTimelineData, {url_id: urlSiteId});

    if (event) {
        changeEventByData(event);
    } else {
        changeEvent(0);
    }
}

function changeEventByData(nextEvent) {
    nextEvent = nextEvent.index != null ? nextEvent : nextEvent.related_book;

    changeEventStatus(currentEvent, false);
    currentEvent = nextEvent;
    currentEventIndex = nextEvent.index;
    currentEvent.view.classed('hidden', false);
    changeEventStatus(currentEvent, true);
    changeViewVpc(currentEvent.chapterData);

    var nextBookOffset = 0,
        nextHistoryOffset = 0;
    var bookData = currentEvent.chapterData || null,
        historyData = currentEvent.chapterData ? currentEvent.related_history : currentEvent;
    var bookOffset = getBookOffset(currentEvent.chapterData);

    changeViewYear(historyData);
    if (bookOffset != null) {
        nextBookOffset = bookOffset;
        nextHistoryOffset = prevHistoryOffset;
        prevBookOffset = bookOffset;
    } else {
        var historyOffset = getHistoryOffset(historyData);

        if (historyOffset != null) {
            nextBookOffset = prevBookOffset;
            nextHistoryOffset = historyOffset;
            prevHistoryOffset = historyOffset;
        }
    }

    if (bookData && historyData) {
        var rectHistoryAbsolute = historyData.yearOffset;
        var rectBookAbsolute = bookData.absolute_id * HEIGHT_CHAPTER;
        var rectHistoryOffset = rectHistoryAbsolute + nextHistoryOffset;
        var rectBookOffset = rectBookAbsolute + nextBookOffset;
        var rectDeviation = timelineOverflowCenter - EDGE_ACTIVE_POIN_OFFSET;

        var distance = Math.abs(rectHistoryOffset - rectBookOffset);
        if (distance > rectDeviation) {
            nextHistoryOffset -= Math.abs(distance - rectDeviation);
        }

        var rectHistoryReal = nextHistoryOffset + rectHistoryAbsolute;

        if (rectHistoryReal < EDGE_ACTIVE_POIN_OFFSET) {
            nextHistoryOffset += EDGE_ACTIVE_POIN_OFFSET - rectHistoryReal;
        }

        if (rectHistoryReal > timelineOverflowHeight - EDGE_ACTIVE_POIN_OFFSET) {
            nextHistoryOffset -= rectHistoryReal - timelineOverflowHeight - EDGE_ACTIVE_POIN_OFFSET;
        }

        prevHistoryOffset = nextHistoryOffset;
    }

    updateTimelineWrapper(nextHistoryOffset, nextBookOffset, historyData, bookData);
}

function getBookOffset(chapterData) {
    if (chapterData) {
       return getWrapperOffset(chapterData.absolute_id * HEIGHT_CHAPTER);
    }
}

function getHistoryOffset(historyEvent) {
    if (historyEvent && historyEvent.yearOffset) {
       return getWrapperOffset(historyEvent.yearOffset);
    }
}

function getWrapperOffset(offset) {
    let minOffset = -timelineHeight + timelineOverflowCenter;
    offset = - offset + timelineOverflowCenter;
    offset = offset > 0 ? 0 : offset;
    offset = offset < minOffset ? minOffset : offset;

    return offset;
}

function changeViewVpc(chapterData) {
    if (chapterData) {
        volNameView.text(chapterData.vol.title);
        partNameView.text(chapterData.part.title);

        watermarkVolView.text(chapterData.vol.title);
        watermarkPartView.text(chapterData.part.title);
    }
}

function changeViewYear(nextHistory) {
    if (nextHistory && nextHistory.yearData && (!prevYear || nextHistory.yearData.year !== prevYear.year)) {
        if (prevYear) {
            prevYear.yearView
                .classed('active', false)
                    .select('.year-title')
                    .interrupt()
                    .transition(CHANGE_EVENT_DURATION)
                    .attr('dy', YEAR_FONT_SIZE)
            ;
        }
        prevYear = nextHistory.yearData;
        prevYear.yearView
            .classed('active', true)
                .select('.year-title')
                .interrupt()
                .transition(CHANGE_EVENT_DURATION)
                .attr('dy', ACTIVE_YEAR_FONT_SIZE)
        ;
    }
}

function changeEventStatus(event, state) {
    if (event) {
        event.view.classed('hidden', !state);
        if (event.related_history) {
            event.related_history.view.classed('hidden', !state);
            setEventStatusHistoryPoint(event.related_history.datePointView, state);
        } else if (event.datePointView) {
            setEventStatusHistoryPoint(event.datePointView, state);
        }

        if (event.chapterData && event.chapterData.chapterRectView) {
            event.chapterData.chapterRectView.classed('active', state);
        }
    }
}

function setEventStatusHistoryPoint(view, state) {
    var t = state ? 'rotate(45) scale(1.5)' : 'rotate(0) scale(1)';
    var rt = state ? 'rotate(-45) scale(1)' : 'rotate(0) scale(0)';

    view
        .classed('active', state)
        .each(function(d) {
            d.datePointWrapperView
                .classed('active', state)
                .interrupt()
                .transition(LONG_CHANGE_EVENT_DURATION)
                .delay(250)
                .attrTween("transform", function() {
                    return d3.interpolateTransform(
                        d3.select(this).attr('transform'),
                        rt
                    );
                })
            ;
        })
    ;
    view
        .select('.date-box')
        .interrupt()
        .transition(CHANGE_EVENT_DURATION)
        .attrTween("transform", function() {
            return d3.interpolateTransform(
                d3.select(this).attr('transform'),
                t
            );
        })
    ;
}

function drawEvents(events) {
    var historyEventView = historyWrapperView
        .selectAll('.history__event')
        .data(events.history)
        .enter()
            .append('div')
            .each(function(d) {d.view = d3.select(this);})
            .attr('class', 'history__event event hidden')
    ;
    historyEventView
        .append('h5')
        .attr('class', 'event__title')
        .text(d => d.title)
    ;
    historyEventView
        .append('div')
        .attr('class', 'event__text')
        .html(d => d.text)
    ;
    var bookEventViews = bookWrapperView
        .selectAll('.book__event')
        .data(events.book)
        .enter()
            .append('div')
            .each(function(d) {d.view = d3.select(this);})
            .attr('class', 'book__event event hidden')
    ;
    bookEventViews
        .append('h5')
        .attr('class', 'event__title')
        .text(d => !d.related_history ? d.title : '')
    ;
    bookEventViews
        .append('div')
        .attr('class', 'event__text')
        .html(d => d.text)
    ;
    bookEventViews
        .append('div')
        .attr('class', 'event__read')
        .text('Читать: ')
            .append('a')
            .attr('class', 'event__url')
            .attr('href', '#')
                .attr('target', '_blank')
                .text(d => {
                    var vol = bookStructure[d.vpc.vol_id];
                    var part = vol.parts[d.vpc.part_id];
                    var chapter = d.vpc.chapter_id + 1;

                    return [vol.title, part.title, 'Глава ' + chapter].join(', ');
                })
                .attr('href', d => consts.bookURL + d.url_site_id)
    ;
}

function changeTimelineSize() {
    var wh = contentView[0][0].getBoundingClientRect().height;
    var hh = headerView[0][0].getBoundingClientRect().height;

    timelineOverflowHeight = wh - hh;
    timelineOverflowCenter = (timelineOverflowHeight - CONTENT_BOTTOM_OFFSET)/2;
    contentWrapperView.style('height', (timelineOverflowHeight - CONTENT_BOTTOM_OFFSET) + 'px');
    contentPartViews
        .selectAll('.wrapper')
        .style('height', timelineOverflowHeight + 'px')
        .style('padding-bottom', (CONTENT_BOTTOM_OFFSET + 10) + 'px')
    ;
    timelineWidth = timelineView[0][0].getBoundingClientRect().width;
    timelineHeight = totalChapters*HEIGHT_CHAPTER;
    BOOK_X1 = timelineWidth - WIDTH_CHAPTER - BOOK_TIMELINE_PAD;

    bookTimelineView.attr('transform', 'translate(' + BOOK_X1 + ', 0)');

    timelineView.attr('height', timelineHeight);
    timelineYearsView.attr('height', timelineHeight);

    yearTimelineView.attr('transform', 'translate(' + timelineWidth + ', 0)');
}

function intiTimeScale(beginDate, endDate, dates) {
    var numDates = dates.length;
    _.each(dates, d => d.year = d.date.getFullYear());

    var datesByYear = d3.nest()
        .key(d => d.year)
        .entries(dates)
        .reduce((memo, group) => {
            memo[group.key] = group.values
            return memo;
        }, {})
    ;
    var years = _.invoke(_.range(beginDate.getFullYear(), endDate.getFullYear() + 1, 1), 'toString');
    var minYearHeight = timelineHeight*.4/years.length,
        restYearsHeight = timelineHeight*.6,
        lastYearY = 0;
    var ranges = _.map(years, d => {
        var currentYearY = lastYearY;

        if (datesByYear[d]) {
            lastYearY += minYearHeight + datesByYear[d].length*restYearsHeight/numDates;
        } else {
            lastYearY += minYearHeight;
        }
        return currentYearY;
    });

    ranges.push(lastYearY);
    years = _.map(years, d => new Date(d, 0, 1));
    years.push(endDate);

    timeScale
        .domain(years)
        .range(ranges)
    ;
}

function drawChapterTimeline(vols) {
    var partViews = bookTimelineView
        .select('.vols')
        .selectAll('.vol')
        .data(vols)
        .enter()
        .append('g')
        .attr('class', 'vol')
        .attr('transform', d => 'translate(0,' + d.chaptersBefore*HEIGHT_CHAPTER + ')')
            .selectAll('.part')
            .data(d => d.parts)
            .enter()
            .append('g')
            .attr('class', 'part')
            .attr('transform', d => 'translate(0,' + d.chaptersBefore*HEIGHT_CHAPTER + ')')
    ;
    var chapterViews = partViews
        .selectAll('.chapter')
        .data(d => d.chapters)
        .enter()
        .append('g')
        .each(function(d) {d.chapterRectView = d3.select(this);})
        .attr('class', 'chapter')
        .attr('transform', (d, i) => 'translate(0,' + i*HEIGHT_CHAPTER + ')')
        .classed('chapter_war', d => d.war)
    ;
    chapterViews
        .append('rect')
        .attr('class', 'chapter__rect')
        .attr('width', WIDTH_CHAPTER)
        .attr('height', HEIGHT_CHAPTER)
    ;
    chapterViews
        .filter(d => !!d.event)
        .on('click', d => changeEventByData(d.event))
        .classed('chapter_clickable', true)
            .append('text')
            .attr('class', 'chapter__roman-index')
            .attr('text-anchor', 'middle')
            .attr('x', WIDTH_CHAPTER/2)
            .attr('y', HEIGHT_CHAPTER/2)
            .attr('dy', 5.5)
            .text(d => util.arabicToRoman(d.chapter_id + 1))
    ;
    partViews.append('line')
        .attr('class', 'part-delemiter')
        .attr('y1', 0.5)
        .attr('y2', 0.5)
        .attr('x1', 0)
        .attr('x2', WIDTH_CHAPTER)
    ;
}

function drawYearsTimeline() {
    var domain = _.map(timeScale.domain(), date => date.getFullYear());
    yearsData = _.map(_.range(domain[0], domain[domain.length-1] + 1, 1), year => ({year}));

    yearTimelineView.selectAll('.year')
        .data(yearsData)
        .enter()
        .append('g')
        .each(function(d) {
            d.yearNext = d.year + 1;
            d.startYearY = timeScale(new Date(d.year, 0));
            d.endYearY = timeScale(new Date(d.yearNext, 0));
            d.localYearY = (d.endYearY - d.startYearY)/2
            d.yearView = d3.select(this);
        })
        .attr('class', 'year')
        .attr('transform', d => 'translate(0,' + d.startYearY + ')')
            .append('text')
            .attr('class', 'year-title')
            .attr('text-anchor', 'end')
            .attr('dy', YEAR_FONT_SIZE)
            .attr('x', -10)
            .attr('y', 0)
            .text(d => d.year)
    ;
    yearInTimelineView.selectAll('.year')
        .data(yearsData)
        .enter()
        .append('g')
        .attr('class', 'year')
        .attr('transform', d => 'translate(0,' + d.startYearY + ')')
            .append('line')
            .attr('class', 'year-delemiter')
            .attr('y1', 0.5)
            .attr('y2', 0.5)
            .attr('x1', DATES_X1 + 3)
            .attr('x2', timelineWidth/2)
    ;
}

function drawHistoryTimeline(dates) {
    var DISTANCE_BETWEEN_POINTS = MIN_DATE_POINTS_OFFSET + EVENT_POINT_SIZE;
    var _historyTimeline = timelineView.select('.history-timeline');
    var _dates = _historyTimeline.select('.dates')
        .attr('transform', 'translate(' + DATE_POINTS_X + ',0)');
    var lastDateY = 0;

    var dateViews = _dates
        .selectAll('.date')
        .data(dates)
        .enter()
        .append('g')
        .each(function(d) {d.datePointView = d3.select(this);})
        .attr('class', 'date')
        .attr('transform', (d) => {
            var currentY = timeScale(d.date);
            var currentYearY = timeScale(new Date(d.date.getFullYear(), 0));
            var yearOffset =  currentY - currentYearY;

            if (yearOffset < DISTANCE_BETWEEN_POINTS) {
                currentY += DISTANCE_BETWEEN_POINTS - yearOffset;
            }

            var offset = currentY - lastDateY;

            if (offset < DISTANCE_BETWEEN_POINTS) {
                lastDateY = currentY + DISTANCE_BETWEEN_POINTS - offset;
            } else {
                lastDateY = currentY;
            }
            d.yearOffset = lastDateY;

            return 'translate(0,' + lastDateY  + ')';
        })
        .on('click', d => changeEventByData(d))
    ;
    datePointViews = dateViews;

    _dates.selectAll('.date-box-wrapper')
        .data(dates)
        .enter()
            .insert('g', ':first-child')
            .attr('class', 'date-box-wrapper')
            .attr('transform', d => 'translate(0,' + d.yearOffset  + ')')
                .append('rect')
                .each(function(d) {d.datePointWrapperView = d3.select(this);})
                .attr('class', 'date-box-wrapper-rect')
                .attr('y', -WRAPPER_POINT_OFFSET)
                .attr('x', -WRAPPER_POINT_OFFSET)
                .attr('width', EVENT_WRAPPER_POINT_SIZE)
                .attr('height', EVENT_WRAPPER_POINT_SIZE)
                .attr('transform', 'rotate(0) scale(0)')
                .attr('fill', 'url(#rect-grad)')
    ;
    dateViews
        .append('rect')
        .attr('class', 'date-box')
        .attr('y', -POINT_OFFSET)
        .attr('x', -POINT_OFFSET)
        .attr('width', EVENT_POINT_SIZE)
        .attr('height', EVENT_POINT_SIZE)
        .attr('transform', 'rotate(0) scale(1)')
    ;
    datePointTextViews = dateViews
        .append('text')
        .attr('class', 'date-text')
        .attr('text-anchor', 'start')
        .attr('dy', POINT_OFFSET)
        .attr('x', EVENT_POINT_SIZE + POINT_OFFSET)
        .text(d => d.short_title)
    ;
}

function drawLinks() {
    linksView
        .attr('transform', 'translate(' + DATE_POINTS_X + ',0)')
    ;
}

function drawShadowLinks(links) {
    shadowLinkViews = shadowLinksView
        .selectAll('.shadow-event-link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'shadow-event-link')
        .classed('war', d => d.related_book.chapterData.war)
    ;
}

function drawGrid(links) {
    gridLinkViews = gridView
        .attr('transform', 'translate(' + GRID_X1 + ',0)')
        .selectAll('.grid-link')
        .data(links).enter()
            .append('path')
            .attr('class', 'grid-link')
    ;
    updateGrid();
}

// load data

function loadUrls() {
    d3.tsv(require('_data/urls.tsv'), data => {
        dataUrls = data;
        plusLoad();
    });
}

function loadData() {
    d3.tsv(require('_data/data.tsv'), data => {
        timelineData = _.map(data, v => {
            let period = util.getHistoryPeriod(v.history_period);
            let obj = {
                title: v.title,
                text: v.text,
                date: dateParser.getDate(v.date),
                history_period: period.history_period,
                history_period_label: period.history_period_label,
                id: v.id,
            };

            v.type = v.type.toLowerCase();

            if (v.type === 'и') {
                obj.type = 'history';
                obj.history_id = v.history_id;
                obj.related_book_id = v.related_book_id;
                obj.fragments = util.getChapters(v.fragments);
                obj.short_title = v.short_title;

                return obj;
            } else if (v.type === 'л') {
                obj.type = 'book';
                if (v.vpc_id.length != 4) {
                    console.log(v.id, 'не верный формат vlc_id:', v.vpc_id);
                } else {
                    obj.vpc_id = v.vpc_id;
                    obj.vpc = util.deserializeVcpObject(v.vpc_id);
                }
                return obj;
            }

            console.log('тип записи не найден:', v.type);
        });

        dataByType = d3
            .nest()
            .key(d => d.type)
            .entries(timelineData)
            .reduce((memo, group) => {
                memo[group.key] = group.values
                return memo;
            }, {})
        ;

        plusLoad();
    });
}

function loadLinks() {
    d3.tsv(require('_data/relations.tsv'), data => {
        var history_period;
        var history_period_label;

        dataLinks = _.chain(data)
            .map(v => {
                var hasPeriod = !!util.clearValue(v.history_period, true);
                if (hasPeriod) {
                    let period = util.getHistoryPeriod(v.history_period);

                    history_period = period.history_period;
                    history_period_label = period.history_period_label;
                }

                var history_date = dateParse.convertDate(v.history_date, history_period.begin.getFullYear());
                var book_date = dateParse.convertDate(v.book_date, history_period.begin.getFullYear());

                var date = history_date || book_date || hasPeriod && history_period;
                var chapters = util.getChapters(v.chapters);

                var hasError = false;
                if (!date) {
                    console.log(v, 'отсутствует дата в событие');
                    hasError = true;
                }

                if (!_.isDate(date) && chapters.length > 1) {
                    console.log(v, 'диапазону дат может принадлежать одна глава');
                    hasError = true;
                }

                if (hasError) {
                    return [];
                }

                if (_.isDate(date)) {
                    return _.map(chapters, chapter => {
                        return {
                            date,
                            chapter_id: chapter,
                            vpc: util.deserializeVcpObject(chapter),
                            cid: util.getClientID(),
                            history_id: v.history_id
                        };
                    });
                } else {
                    let chapter_id = chapters[0];
                    let vpc = util.deserializeVcpObject(chapter_id);

                    return _.chain(date)
                        .values()
                        .map(date => {
                            return {
                                date,
                                chapter_id,
                                vpc,
                                cid: util.getClientID(),
                                history_id: v.history_id
                            };
                        })
                        .value()
                    ;
                }
            })
            .flatten()
            .sortBy('date')
            .value()
        ;

        plusLoad();
    });
}

function loadChapters() {
    d3.tsv(require('_data/chapters.tsv'), data => {
        dataChapters = data;

        // расчет частей книги
        var prevChapter = null;

        _.each(data, d => {
            if (d.vol_id.toLowerCase() == 'эпилог') {
                d.vol_id = 4;
            } else {
                d.vol_id = parseInt(d.vol_id) - 1;
            }
            d.part_id = parseInt(d.part_id) - 1;
            d.chapter_id = parseInt(d.chapter_id) - 1;
            d.absolute_id = parseInt(d.absolute_id) - 1;
            d.war = d.type.toLowerCase() === 'война';
            d.prevChapter = prevChapter;
            if (prevChapter) {
                prevChapter.nextChapter = d;
            }
            prevChapter = d;
        });

        data[0].prevChapter = prevChapter;
        data[data.length - 1].nextChapter = data[0];

        // construct volumes
        var vols = d3.nest()
            .key(d => d.vol_id)
            .key(d => d.part_id)
            .entries(data)
        ;

        var prevVol = null;

        _.each(vols, (vol, i) => {
            var viewVolIndex = i + 1;
            var currentVol = {
                title: util.arabicToRoman(viewVolIndex) + ' Том',
                shortTitle: 'т.' + (viewVolIndex),
                parts: []
            };

            bookStructure.push(currentVol);

            currentVol.prevVol = prevVol;
            if (prevVol) {
                prevVol.nextVol = currentVol;
            }
            prevVol = currentVol;

            _.each(vol.values, (part, i) => {
                var viewPartIndex = i + 1;
                var currentPart = {
                    vol: currentVol,
                    title: 'Часть ' + viewPartIndex,
                    shortTitle: 'ч.' + viewPartIndex,
                    chapters: part.values,
                    numChapters: part.values.length,
                };

                currentVol.parts.push(currentPart);

                _.each(currentVol.parts[i].chapters, chapter => {
                    chapter.part = currentPart;
                    chapter.vol = currentVol;
                });
            });
        });

        bookStructure[0].prevVol = prevVol;
        bookStructure[bookStructure.length - 1].nextVol = bookStructure[0];

        // calculate total count of parts and chapters
        totalParts = _.reduce(bookStructure, (memo, vols) => {
            vols.partsBefore = memo;

            return _.reduce(vols.parts, (sum, part) => {
                part.absoluteIndex = sum;
                sum++;

                return sum;
            }, vols.partsBefore);
        }, 0);

        totalChapters = _.reduce(bookStructure, (memo, vols) => {
            vols.chaptersBefore = memo;

            return memo + _.reduce(vols.parts, (sum, part) => {
                part.chaptersBefore = sum;

                return sum + part.numChapters;
            }, 0);
        }, 0);

        plusLoad();
    });
}

function plusLoad() {
    remaindFiles--;
    if (!remaindFiles) {
        onLoadAllData();
    }
}

function onLoadAllData() {
    var beginDate = new Date(timelineData[0].history_period.begin.getFullYear(), 0, 1);
    var endDate = new Date(timelineData[timelineData.length - 1].history_period.end.getFullYear(), 11, 31);

    changeTimelineSize();
    intiTimeScale(beginDate, endDate, dataByType.history);
    appendLinks(dataByType.history, dataByType.book);
    drawYearsTimeline();
    historyFilteredTimelineData = _.filter(timelineData, d => d.related_book)
    filteredTimelineData = _.filter(timelineData, d => !d.related_book);
    _.each(filteredTimelineData, (event, index) => {
        event.index = index;
        if (event.vpc) {
            event.chapterData = util.getChapterByVpc(bookStructure, event.vpc);
            event.chapterData.event = event;
            event.chapterOffset = event.chapterData.absolute_id * HEIGHT_CHAPTER;
            event.middleChapterOffset = event.chapterOffset + HEIGHT_CHAPTER/2;
            
            var url = _.findWhere(dataUrls, {quote: event.text});
            if (url) {
                updateEventUrls(event, url);
            } else {
                var lastPercent = 0;

                for (var i = 0; i < dataUrls.length; i++) {
                    var _url = dataUrls[i];
                    var percent = util.compareStrings(_url.quote, event.text);
                    if (percent > lastPercent) {
                        lastPercent = percent;
                        url = _url;
                    }
                }

                if (url) {
                    updateEventUrls(event, url);
                } else {
                    console.log('нет ссылки для такой цитаты', event);
                }
            }
        }
    });

    _.each(timelineData, event => {
        if (!event.vpc) {
            event.yearData = _.findWhere(yearsData, {year: event.date.getFullYear()});
        }
    });

    drawEvents(dataByType);
    drawChapterTimeline(bookStructure);
    drawHistoryTimeline(dataByType.history);

    _.each(dataLinks, link => {
        link.chapterData = util.getChapterByVpc(bookStructure, link.vpc);
        link.historyData = _.findWhere(dataByType.history, {history_id: link.history_id});
        link.yearOffset = timeScale(link.date);
    });
    drawLinks();
    drawShadowLinks(historyFilteredTimelineData);

    _.defer(function() {
        changeTimelineSize();

        if (window.location.hash) {
            changeEventByURLID(window.location.hash.substr(1));
        } else {
            changeEvent(0);
        }

        timelineView.on('wheel', _.throttle(function () {
            var chapter_scroll =  SCROLL_SIZE / filteredTimelineData.length;

            timelineScroll += d3.event ? d3.event.deltaY : 0;
            var index = Math.floor(timelineScroll / chapter_scroll);
            changeEvent(index);
        }, 100));

        window.onresize = function() {
            changeTimelineSize();
        }
    });
}

function appendLinks(historyEvents, bookEvents) {
    _.each(historyEvents, (historyEvent) => {
        if (historyEvent.related_book_id) {
            let bookEvent = _.findWhere(bookEvents, {id: historyEvent.related_book_id});

            if (bookEvent) {
                historyEvent.related_book = bookEvent;
                bookEvent.related_history = historyEvent;
            } else {
                console.log(historyEvent.id, 'нет такого id в цитатах:', historyEvent.related_book_id);
            }
        }

    });
}

function updateEventUrls(event, url) {
    var site_id = url.url_site_id.split('_');

    site_id.shift();
    event.url_id = url.url_id;
    event.url_site_id = site_id.join('_');
    event.text = url.newquote
        .replace(/\<.+?\>/g, '')
        .replace(/\.\s*-/g, '.<br>-')
        .replace(/\?\s*-/g, '.<br>-')
        .replace(/\!\s*-/g, '.<br>-')
    ;
}

function getLinkPathAttr(y1, y2) {
    var pointOffset = EVENT_POINT_SIZE/2;
    var chapterX = BOOK_X1 - DATE_POINTS_X;

    var points = [
        {x: pointOffset, y: y1 - pointOffset},
        {x: -pointOffset, y: y1 - pointOffset},
        {x: -pointOffset, y: y1 + pointOffset},
        {x: pointOffset, y: y1 + pointOffset},
        {x: chapterX, y: y2 + HEIGHT_CHAPTER},
        {x: chapterX + WIDTH_CHAPTER, y: y2 + HEIGHT_CHAPTER},
        {x: chapterX + WIDTH_CHAPTER, y: y2},
        {x: chapterX, y: y2},
    ];

    return pathFn(points);
}

// redraw content wrappers

function updateTimelineWrapper(historyY, bookY, historyData, bookData) {
    if (historyData && bookData) {
        var y1s = util.getTransformY(historyGroupView) + historyData.yearOffset;
        var y2s = util.getTransformY(bookTimelineView) + bookData.absolute_id * HEIGHT_CHAPTER;
        var y1e = historyY + historyData.yearOffset;
        var y2e = bookY + bookData.absolute_id * HEIGHT_CHAPTER;

        updateLinks(y1s, y2s, y1e, y2e, bookData.war);
    } else {
        updateLinks();
    }

    updateShadowLinks(historyY, bookY);

    historyGroupView
        .interrupt()
        .transition(TIMELINE_DURATION)
        .attrTween("transform", function(interpolate) {
            return d3.interpolateTransform(
                d3.select(this).attr('transform'),
                'translate(0, ' + historyY + ')'
            );
        })
    ;
    bookTimelineView
        .interrupt()
        .transition(TIMELINE_DURATION)
        .attrTween("transform", function(interpolate) {
            return d3.interpolateTransform(
                d3.select(this).attr('transform'),
                'translate(' + BOOK_X1 + ', ' + bookY + ')'
            );
        })
    ;
    yearTimelineView
        .interrupt()
        .transition(TIMELINE_DURATION)
        .attrTween("transform", function(interpolate) {
            return d3.interpolateTransform(
                d3.select(this).attr('transform'),
                'translate(' + timelineWidth + ', ' + historyY + ')'
            );
        })
    ;
    if (prevYear) {
        var yearOffset = -historyY;

        yearOffset = yearOffset < prevYear.startYearY ? prevYear.startYearY : yearOffset;
        prevYear.yearView
            .interrupt()
            .transition(TIMELINE_DURATION)
            .attrTween("transform", function(interpolate) {
                return d3.interpolateTransform(
                    d3.select(this).attr('transform'),
                    'translate(0, ' + yearOffset + ')'
                );
            })
        ;
    }
}

// redraw the time grid

function updateGrid(animate) {
    var yearX = 0;
    var yearX2 = yearX + WIDTH_CHAPTER*1.5 + EVENT_POINT_SIZE/2;
    var chapterX = BOOK_X1 - GRID_X1;
    var chapterX2 = chapterX + WIDTH_CHAPTER;
    var animateStepY = animate && animate.y || 0;

    gridLinkViews.attr('d', link => {
            var chapterY = link.chapterData.absolute_id * HEIGHT_CHAPTER;
            var yearY = link.yearOffset;

            if (link.historyData) {
                yearY = link.historyData.yearOffset;
            }

            var points = [
                {x: yearX, y: yearY + animateStepY},
                {x: yearX2, y: yearY + animateStepY},
                {x: chapterX, y: chapterY},
                {x: chapterX2, y: chapterY},
            ];

            return pathFn(points);
        })
    ;
}

// redraw the main linked line

function updateLinks(y1s, y2s, y1e, y2e, war) {
    var linkViews = linksView.select('.event-link')

    if (y1s != null && y2s != null) {
        linkViews
            .classed('war', war)
            .style('display', 'block')
            .interrupt()
            .attr('d', link => getLinkPathAttr(y1s, y2s))
            .transition(TIMELINE_DURATION)
            .attr('d', link => getLinkPathAttr(y1e, y2e))
        ;
    } else {
        linkViews
            .style('display', 'none')
            .interrupt()
            .attr('d', '')
        ;
    }
}

// redraw linked thin lines

function updateShadowLinks(historyY, bookY) {
    shadowLinkViews
        .interrupt()
        .transition(TIMELINE_DURATION)
        .attr('y1', d => d.yearOffset + historyY - 1)
        .attr('y2', d => d.related_book.middleChapterOffset + bookY - 1)
        .attr('x1', DATE_POINTS_X + POINT_OFFSET)
        .attr('x2', BOOK_X1)
    ;
}

// init the application
_.each(fileLoaders, loader => loader());
