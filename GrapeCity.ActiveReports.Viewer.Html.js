!function(window) {
    function ActionItemsResolver() {
        function isArDrillthroughLink(link) {
            return null === link || void 0 === link ? !1 : link.match("javascript") && link.match(".goToReport");
        }
        function getElementData(element, attributeName) {
            var data = element.attr(attributeName);
            return null === data || void 0 === data || 0 === data.length ? null : decodeURI(data);
        }
        function resolveBookmarkInfo(data) {
            function extractByKey(array, key, separator) {
                for (var i = 0; i < array.length; i++) {
                    var elem = array[i], preffix = elem.substring(0, key.length);
                    if (preffix.toUpperCase() === key.toUpperCase()) return elem.substring(key.length + separator.length, elem.length);
                }
                return null;
            }
            if (null === data || void 0 === data) return null;
            var bookmarkInfo = data.split(","), pageNumberValue = extractByKey(bookmarkInfo, "PageNumber", "=");
            if (null === pageNumberValue) return null;
            pageNumberValue = parseInt(pageNumberValue, 10);
            var targetValue = extractByKey(bookmarkInfo, "Target", "=");
            return null === targetValue ? null : {
                PageNumber: pageNumberValue,
                Target: targetValue
            };
        }
        function resolveToggleInfo(data) {
            var parsedData;
            try {
                parsedData = $.parseJSON(data);
            } catch (ex) {
                return null;
            }
            return null === parsedData || void 0 === parsedData ? null : parsedData;
        }
        function resolvePageReportElementAction(element) {
            var dataValue = htmlDecode(getElementData(element, "data")), hrefValue = htmlDecode(getElementData(element, "href"));
            if (null === dataValue && null === hrefValue) return null;
            var bookmarkInfo = resolveBookmarkInfo(dataValue);
            if (null === bookmarkInfo && (bookmarkInfo = resolveBookmarkInfo(hrefValue)), null !== bookmarkInfo) return {
                actionType: ActionType.bookmark,
                reportType: ReportType.pageReport,
                element: element,
                pageNumber: bookmarkInfo.PageNumber,
                target: bookmarkInfo.Target
            };
            if (element.is("[class$=toggle]")) {
                var toggleInfo = resolveToggleInfo(dataValue);
                if (null !== toggleInfo) return {
                    actionType: ActionType.toggle,
                    reportType: ReportType.pageReport,
                    element: element,
                    toggleInfo: toggleInfo
                };
            }
            var drillthroughInfo = null !== dataValue ? dataValue : null !== hrefValue ? hrefValue : null;
            if (element.is("[class$=drillthrough]") || isArDrillthroughLink(drillthroughInfo)) return {
                actionType: ActionType.drillthrough,
                reportType: ReportType.pageReport,
                element: element,
                drillthroughLink: drillthroughInfo
            };
            var hyperlinkUrl = null !== dataValue ? dataValue : null !== hrefValue ? hrefValue : null;
            return null !== hyperlinkUrl ? {
                actionType: ActionType.hyperlink,
                reportType: ReportType.pageReport,
                element: element,
                url: hyperlinkUrl
            } : null;
        }
        function htmlDecode(value) {
            return value ? $("<div />").html(value).text() : null;
        }
        function resolveFromPageReportContent(content) {
            return $(content).find("a").map(function(index, item) {
                return resolvePageReportElementAction($(item));
            }).filter(function(item) {
                return null !== item;
            }).get().concat($(content).find("map > area").map(function(index, item) {
                return resolvePageReportElementAction($(item));
            }).filter(function(item) {
                return null !== item;
            }).get()).concat($(content).find("span").map(function(index, item) {
                return resolvePageReportElementAction($(item));
            }).filter(function(item) {
                return null !== item;
            }).get());
        }
        function resolveFromSectionReportContent(content) {
            return $(content).find("a").map(function(index, item) {
                var element = $(item), url = getElementData(element, "href");
                if (null === url) return !0;
                var sectionBookmarkLabel = /^toc?:\/\/(.*)/i.exec(url);
                return null !== sectionBookmarkLabel ? {
                    actionType: ActionType.bookmark,
                    reportType: ReportType.sectionReport,
                    element: element,
                    label: sectionBookmarkLabel[1]
                } : {
                    actionType: ActionType.hyperlink,
                    reportType: ReportType.sectionReport,
                    element: element,
                    url: url
                };
            }).filter(function(item) {
                return null !== item;
            }).get();
        }
        function resolve(content, reportType) {
            switch (reportType) {
              case ReportType.pageReport:
                return resolveFromPageReportContent(content);

              case ReportType.sectionReport:
                return resolveFromSectionReportContent(content);

              default:
                return [];
            }
        }
        var resolver = {
            resolve: resolve
        };
        return resolver;
    }
    function parseParameterValue(value, type) {
        if (null === value) return null;
        if (type == ServiceParameterType.DateTime) {
            var millis = (+value - ticksOffsetFromUnixEpoch) / ticksInMillisecond, millisUtc = millis + new Date(millis).getTimezoneOffset() * millisecondsInMinute;
            return new Date(millisUtc);
        }
        return value;
    }
    function ar_convertServiceParameters(parameters) {
        function convertValues(values, type) {
            return (values || []).map(function(v) {
                return {
                    label: v.Label,
                    value: parseParameterValue(v.Value, type)
                };
            });
        }
        function resolveEditor(p) {
            return p.MultiLine && p.ParameterType == ServiceParameterType.String ? ParameterEditorType.MultiLine : p.AvailableValues && p.AvailableValues.length > 0 ? p.MultiValue ? ParameterEditorType.MultiValue : ParameterEditorType.SelectOneFromMany : ParameterEditorType.SingleValue;
        }
        var ServiceParameterState = {
            Ok: 0,
            ExpectValue: 1,
            HasOutstandingDependencies: 2,
            ValidationFailed: 3,
            DynamicValuesUnavailable: 4
        };
        return parameters.map(function(p) {
            return {
                name: p.Name,
                value: parseParameterValue(p.Value, p.ParameterType),
                values: convertValues(p.Values, p.ParameterType),
                availableValues: convertValues(p.AvailableValues, p.ParameterType),
                prompt: p.Prompt || p.Name,
                nullable: !!p.Nullable,
                multiline: !!p.MultiLine,
                multivalue: !!p.MultiValue,
                allowEmpty: !!p.AllowEmpty,
                dateOnly: !!p.DateOnly,
                type: function(value) {
                    switch (value) {
                      case ServiceParameterType.DateTime:
                        return ParameterType.DateTime;

                      case ServiceParameterType.Bool:
                        return ParameterType.Bool;

                      case ServiceParameterType.Int:
                        return ParameterType.Int;

                      case ServiceParameterType.Float:
                        return ParameterType.Float;

                      default:
                        return ParameterType.String;
                    }
                }(p.ParameterType),
                state: function(value) {
                    switch (value) {
                      case ServiceParameterState.ExpectValue:
                        return ParameterState.ExpectValue;

                      case ServiceParameterState.HasOutstandingDependencies:
                        return ParameterState.HasOutstandingDependencies;

                      case ServiceParameterState.ValidationFailed:
                        return ParameterState.ValidationFailed;

                      case ServiceParameterState.DynamicValuesUnavailable:
                        return ParameterState.DynamicValuesUnavailable;

                      default:
                        return ParameterState.Ok;
                    }
                }(p.State),
                error: p.ExtendedErrorInfo || "",
                editor: resolveEditor(p),
                dependantParameterNames: (p.DependantParameters || []).map(function(dependant) {
                    return dependant.Name;
                })
            };
        });
    }
    function ar_convertClientParameters(parameters) {
        return parameters.map(ar_convertClientParameter);
    }
    function ar_convertClientParameter(p) {
        function serialize(value, type) {
            if (value && value.getMonth) {
                var millisLocal = value.getTime() - value.getTimezoneOffset() * millisecondsInMinute;
                return millisLocal * ticksInMillisecond + ticksOffsetFromUnixEpoch;
            }
            return value;
        }
        function convertValues(values) {
            return (values || []).map(function(v) {
                return {
                    Label: v.label || "",
                    Value: serialize(v.hasOwnProperty("value") ? v.value : v)
                };
            });
        }
        return p.multivalue ? {
            MultiValue: !0,
            Name: p.name,
            Values: convertValues(p.values)
        } : {
            Name: p.name,
            Value: serialize(p.value)
        };
    }
    function ArReportService(options, resourceManager) {
        function isUndefined(value) {
            return void 0 === value || null === value;
        }
        function productVersion() {
            return "10.99.6254.0";
        }
        function open(reportId, parameters) {
            return $base.post("OpenReport", {
                version: 4,
                culture: "en_US",
                reportPath: reportId,
                acceptedFormats: [ formats.Html ],
                lifeTime: 600
            }).then(function(d) {
                if (isUndefined(d.Token)) return $base.invalidResponse(d);
                if (d.ProductVersion > productVersion()) return $base.errorPromise(SR("error.JsVersionsMismatch"));
                var reportInfo = {
                    token: d.Token,
                    parameters: ar_convertServiceParameters(d.ParameterCollection || []),
                    reportType: getReportType(d.DocumentFormat),
                    autoRun: d.AutoRun
                };
                if (parameters && parameters.length) {
                    var def = $.Deferred();
                    return parameters = mergeParameters(reportInfo.parameters, parameters), validateParameters(reportInfo.token, parameters).done(function(params) {
                        def.resolve($.extend(reportInfo, {
                            parameters: params
                        }));
                    }).fail(function() {
                        def.resolve(reportInfo);
                    }), def.promise();
                }
                return reportInfo;
            });
        }
        function openDrillthroughReport(token, reportId) {
            return $base.post("OpenDrillthroughReport", {
                token: token,
                reportPath: reportId,
                lifeTime: 3600
            }).then(function(d) {
                return isUndefined(d.Token) ? $base.invalidResponse(d) : {
                    token: d.Token,
                    parameters: ar_convertServiceParameters(d.ParameterCollection || []),
                    reportType: getReportType(reportId),
                    autoRun: d.AutoRun
                };
            });
        }
        function ping(reportToken) {
            return $base.post("GetStatus", {
                token: reportToken
            }).then(function(d) {
                var state = d.LoadState;
                if (isUndefined(state) || isUndefined(d.AvailablePages)) return $base.promise(!1);
                switch (state) {
                  case loadStates.Error:
                  case loadStates.Cancelled:
                  case loadStates.Cancelling:
                    return $base.promise(!1);
                }
                return $base.promise(!0);
            });
        }
        function getReportType(docFormat) {
            if (null === docFormat || void 0 === docFormat) return ReportType.unknown;
            switch (docFormat) {
              case documentFormat.rpx:
              case documentFormat.rdf:
                return ReportType.sectionReport;

              case documentFormat.rdlx:
                return ReportType.pageReport;

              default:
                return ReportType.unknown;
            }
        }
        function close(reportToken, async) {
            return $base.post("CloseReport", {
                token: reportToken
            }, !1, async).then(function() {
                return !0;
            });
        }
        function validateParameters(reportToken, parameters) {
            return $base.post("SetParameters", {
                token: reportToken,
                parametersSetAtClient: ar_convertClientParameters(parameters)
            }, !0).then(function(d) {
                var failedParams = ar_convertServiceParameters(d.ParameterCollection || []);
                return parameters.map(function(p) {
                    var f = failedParams.filter(function(fp) {
                        return fp.name == p.name;
                    });
                    return 1 == f.length ? f[0] : (p.state = ParameterState.Ok, p.error = "", p);
                });
            });
        }
        function validateParameter(reportToken, parameter) {
            return $base.post("ValidateParameter", {
                token: reportToken,
                surrogate: ar_convertClientParameter(parameter)
            }).then(function(d) {
                return ar_convertServiceParameters(d.ParameterCollection || []);
            });
        }
        function areValidParameters(parameters) {
            return parameters.every(function(p) {
                return p.state == ParameterState.Ok;
            });
        }
        function run(reportToken) {
            return runImpl(reportToken);
        }
        function runImpl(reportToken) {
            return $base.post("RunReport", {
                token: reportToken
            }).then(function() {
                return pollStatus(reportToken);
            }).then(function() {
                return getDocumentUrl(reportToken);
            });
        }
        function pollStatus(reportToken, returnPagesCount) {
            return $base.delay(getStatus.bind(service, reportToken), pollingTimeout).then(function(status) {
                return returnPagesCount ? status.pageCount : status.pageCount > 0 || pollStatus(reportToken);
            });
        }
        function getStatus(reportToken) {
            return $base.post("GetStatus", {
                token: reportToken
            }).then(function(d) {
                var state = d.LoadState;
                if (isUndefined(state) || isUndefined(d.AvailablePages)) return $base.errorPromise(SR("error.InvalidResponse"));
                switch (state) {
                  case loadStates.Error:
                    return $base.errorPromise(SR("error.RequestFailed"));

                  case loadStates.Cancelled:
                  case loadStates.Cancelling:
                    return $base.errorPromise(SR("error.RequestCancelled"));
                }
                return {
                    state: state,
                    pageCount: d.AvailablePages
                };
            });
        }
        function getPageCount(doctoken) {
            function getPageCountImpl() {
                getStatus(reportToken).done(function(status) {
                    status.state == loadStates.Completed ? def.resolve(status.pageCount) : (def.notify(status.pageCount),
                    setTimeout(getPageCountImpl, pollingTimeout));
                }).fail(function(problem) {
                    def.reject(problem);
                });
            }
            var reportToken = resolveReportToken(doctoken);
            if (!reportToken) return $base.invalidArg("doctoken", doctoken);
            var def = $.Deferred();
            return getPageCountImpl(), def.promise();
        }
        function getPage(doctoken, index) {
            if (!resolveReportToken(doctoken)) return $base.invalidArg("doctoken", doctoken);
            var urlTemplate = "{0}&Page={1}&ie=" + $.now(), pageUrl = urlTemplate.format(doctoken, index + 1);
            return $base.get(pageUrl);
        }
        function getDocumentUrl(reportToken) {
            return $base.post("GetRenderedReportLink", {
                token: reportToken
            }).then(function(d) {
                var link = d.ReportLink;
                if (isUndefined(link) || isUndefined(link.Uri)) return $base.invalidResponse(d);
                var url = link.Uri;
                return url || resolveReportToken(url) ? url + "&WebViewerControlClientId=html5viewer&HtmlViewer=true" : $base.invalidResponse(d);
            });
        }
        function getToc(doctoken) {
            var reportToken = resolveReportToken(doctoken);
            return reportToken ? loadBookmarks(reportToken, -1).then(function(bookmarks) {
                return {
                    name: "$root",
                    kids: bookmarks
                };
            }) : $base.invalidArg("doctoken", doctoken);
        }
        function getBookmarks(token, parent, fromChild, count) {
            return $base.post("GetBookmarks", {
                token: token,
                parentId: parent,
                fromChild: fromChild,
                count: count
            }).then(function(d) {
                var bookmarks = (d.Bookmarks || []).map(function(b) {
                    var id = b.ID || 0, childCount = b.ChildrenCount || 0, location = b.Location || {
                        X: 0,
                        Y: 0
                    }, kids = [];
                    return childCount > 0 && (kids = function() {
                        return loadBookmarks(token, id);
                    }), {
                        name: b.Name || "",
                        page: b.Page || 0,
                        location: {
                            left: location.X,
                            top: location.Y
                        },
                        isLeaf: 0 === childCount,
                        kids: kids
                    };
                });
                return bookmarks.childCount = d.ChildrenCount || 0, bookmarks;
            });
        }
        function loadBookmarks(token, parent) {
            return loadBookmarksImpl(token, parent, 0).then(function(bookmarks) {
                return delete bookmarks.childCount, bookmarks;
            });
        }
        function toggle(token, toggleInfo) {
            return $base.post("ProcessOnClick", {
                token: token,
                data: toggleInfo
            }).then(function(result) {
                return pollStatus(token, !0);
            }).then(function(pagesCount) {
                return getDocumentUrl(token).then(function(url) {
                    var info = {
                        url: url,
                        pagesCount: pagesCount
                    };
                    return info;
                });
            });
        }
        function loadBookmarksImpl(token, parent, fromChild) {
            return getBookmarks(token, parent, fromChild, 100).then(function(kids) {
                var loadCount = fromChild + kids.length;
                return loadCount >= kids.childCount || loadCount >= maxBookmarksCount ? kids : loadBookmarksImpl(token, parent, loadCount).then(function(next) {
                    return kids.concat(next);
                });
            });
        }
        function resolveReportToken(url) {
            return getQueryParameter(url, "token");
        }
        function getExportUri(doctoken, exportType, settings) {
            var reportToken = resolveReportToken(doctoken);
            return reportToken ? $base.post("GetExportedReportLink", {
                token: reportToken,
                format: exportType,
                exportingParameters: settings,
                pageRange: null
            }).then(function(d) {
                var link = d.ReportLink;
                if (isUndefined(link) || isUndefined(link.Uri)) return $base.invalidResponse(d);
                var url = link.Uri;
                return url || resolveReportToken(url) ? url : $base.invalidResponse(d);
            }) : $base.invalidArg("doctoken", doctoken);
        }
        function exportImpl(doctoken, exportType, settings) {
            function translateSettings(ss) {
                var newSettings = {};
                return Object.keys(ss || {}).forEach(function(key) {
                    var val = ss[key];
                    switch (key) {
                      case "saveAsDialog":
                        val && (newSettings.SaveAsDialog = "true");
                        break;

                      case "printing":
                        val && (exportType == ExportType.Pdf ? newSettings.PrintOnOpen = !0 : exportType == ExportType.Html && (newSettings.WebViewer = !0,
                        newSettings.Printing = !0));
                        break;

                      default:
                        newSettings[key] = val;
                    }
                }), newSettings;
            }
            return getPageCount(doctoken).then(function(pc) {
                if (0 >= pc) throw new Error("document cannot be exported");
                return getExportUri(doctoken, exportType, translateSettings(settings));
            });
        }
        function search(token, searchOptions) {
            var maxSearchResults = searchOptions.maxSearchResults || options.maxSearchResults || defaultMaxSearchResults, reportToken = resolveReportToken(token);
            return reportToken ? $base.post("Search", {
                token: reportToken,
                options: {
                    Text: searchOptions.text,
                    MatchCase: searchOptions.matchCase,
                    WholeWord: searchOptions.wholePhrase,
                    SearchBackward: !1
                },
                startFrom: searchOptions.from ? {
                    ItemIndex: searchOptions.from.idx,
                    TextLen: 1,
                    PageIndex: searchOptions.from.page
                } : {
                    PageIndex: -1
                },
                numberOfResults: maxSearchResults
            }).then(function(d) {
                var dpi = getDpi();
                return {
                    hasMore: d.SearchResults.length == maxSearchResults,
                    matches: d.SearchResults.map(function(sr) {
                        return {
                            idx: sr.ItemIndex,
                            text: sr.DisplayText,
                            page: sr.PageIndex,
                            location: {
                                left: sr.ItemArea.X * dpi,
                                top: sr.ItemArea.Y * dpi,
                                width: sr.ItemArea.Width * dpi,
                                height: sr.ItemArea.Height * dpi
                            }
                        };
                    })
                };
            }) : $base.invalidArg("token", token);
        }
        function drillthrough(token, link) {
            var drillInfo = parseDrillthroughLink(link);
            return drillInfo && drillInfo.reportName ? openDrillthrough(token, drillInfo.reportName, drillInfo.parameters) : $base.errorPromise(SR("error.InvalidDrillthroughLink").format(link));
        }
        function openDrillthrough(token, reportPath, parameters) {
            return openDrillthroughReport(token, reportPath).then(function(r) {
                function run() {
                    return runImpl(r.token).then(function(documentToken) {
                        return {
                            reportToken: r.token,
                            parameters: params,
                            documentToken: documentToken
                        };
                    });
                }
                function findAndUpdateValue(parameter, clientParams) {
                    var cp = clientParams.filter(function(x) {
                        return x.name == parameter.name;
                    });
                    return updateValue(parameter, cp[0]);
                }
                function resolveDependencies(dependencies) {
                    return $.Deferred(function(deferred) {
                        if (dependencies.length > 0) {
                            var dependecy = dependencies.pop();
                            validateParameter(r.token, dependecy).then(function(updated) {
                                return params = params.map(function(p) {
                                    var f = updated.filter(function(u) {
                                        return u.name == p.name;
                                    });
                                    return 1 == f.length ? findAndUpdateValue(f[0], parameters) : p;
                                }), resolveDependencies(dependencies);
                            }).done(deferred.resolve).fail(deferred.reject);
                        } else deferred.resolve();
                    }).promise();
                }
                function resolveDependantParameters() {
                    return $.Deferred(function(deferred) {
                        var dependantParameters = params.filter(function(p) {
                            return p.state == ParameterState.HasOutstandingDependencies;
                        });
                        if (dependantParameters.length > 0) {
                            var dependant = dependantParameters[0], dependencies = params.filter(function(p) {
                                return p.dependantParameterNames && -1 != p.dependantParameterNames.indexOf(dependant.name);
                            });
                            dependencies.length > 0 ? resolveDependencies(dependencies).then(resolveDependantParameters).done(deferred.resolve).fail(deferred.reject) : deferred.reject();
                        } else deferred.resolve();
                    }).promise();
                }
                var params = mergeParameters(r.parameters, parameters);
                return params && params.length > 0 ? resolveDependantParameters().then(function() {
                    return validateParameters(r.token, params);
                }).then(function(p) {
                    return areValidParameters(p) && r.autoRun ? run() : {
                        reportToken: r.token,
                        parameters: params
                    };
                }) : run();
            });
        }
        function updateValue(parameter, clientParameter) {
            function convertValue(value, type) {
                if (type == ParameterType.DateTime) {
                    if ("" === value) return null;
                    if (!Date.isDate(value)) {
                        var d = new Date();
                        return d.setTime(Date.parse(value)), isNaN(d) && (d = parseParameterValue(value, ServiceParameterType.DateTime)),
                        d;
                    }
                    return value;
                }
                return value;
            }
            function findParameterByValue(valuetosearch) {
                for (var i = 0; i < parameter.availableValues.length; i++) if (parameter.availableValues[i].value == valuetosearch) return parameter.availableValues[i];
                return null;
            }
            if (void 0 === clientParameter || null === clientParameter) return parameter;
            if (parameter.multivalue) if (clientParameter.values) parameter.values = clientParameter.values; else {
                if (parameter.values.length > 0 && (parameter.values = []), !Array.isArray(clientParameter.value)) {
                    var t = clientParameter.value;
                    clientParameter.value = [], clientParameter.value.push(t);
                }
                clientParameter.value.map(function(p) {
                    var param = findParameterByValue(p);
                    param || (param = convertValue(p, parameter.type)), parameter.values.push(param);
                });
            } else parameter.value = convertValue(clientParameter.value, parameter.type);
            return parameter;
        }
        function mergeParameters(reportParams, clientParams) {
            var names = [], merged = reportParams.map(function(p) {
                names.push(p.name);
                var cp = clientParams.filter(function(clientParameter) {
                    return p.name == clientParameter.name;
                });
                return 0 === cp.length ? p : updateValue(p, cp[0]);
            });
            return merged.push.apply(merged, clientParams.filter(function(p) {
                return -1 == names.indexOf(p.name);
            }).map(function(p) {
                return void 0 === p.promptUser && (p.promptUser = !1), p;
            })), merged;
        }
        function parseDrillthroughLink(link) {
            function GetViewModel(id) {
                return reportName = id, {
                    goToReport: function(reportName, pp) {
                        xreportName = reportName;
                        for (var i in pp) params.push({
                            name: i,
                            value: pp[i]
                        });
                    }
                };
            }
            var xreportName = "", params = [];
            try {
                var re = new RegExp("&quot;", "g");
                link = link.replace(re, '"'), eval(link);
            } catch (e) {
                return null;
            }
            return {
                reportName: xreportName,
                parameters: params
            };
        }
        if (!options.url) throw new Error("options has no valid url");
        var defaultMaxSearchResults = 50, pagesPollingTimeout = 1e3, pollingTimeout = options.pollingTimeout || pagesPollingTimeout, serviceUrl = options.url;
        serviceUrl.endsWith("/") || (serviceUrl += "/");
        var SR = resourceManager && $.isFunction(resourceManager.get) ? resourceManager.get : identity, formats = {
            Rdf: 0,
            Ddf: 1,
            Xaml: 2,
            Image: 3,
            Pdf: 4,
            Html: 5,
            Word: 6,
            Xls: 7,
            Xml: 8
        }, loadStates = {
            NotStarted: 0,
            InProgress: 1,
            Completed: 2,
            Cancelling: 3,
            Cancelled: 4,
            Error: 5
        }, documentFormat = {
            rpx: 0,
            rdf: 1,
            rdlx: 2
        }, service = {
            open: open,
            close: close,
            toggle: toggle,
            run: run,
            validateParameters: validateParameters,
            validateParameter: validateParameter,
            validateParameterSupported: function() {
                return !0;
            },
            getPageCount: getPageCount,
            getPage: getPage,
            getToc: getToc,
            "export": exportImpl,
            search: search,
            drillthrough: drillthrough,
            ping: ping
        }, $base = ReportServiceBase(service, serviceUrl), maxBookmarksCount = 1e5;
        return service;
    }
    function ars_convertClientParameters(parameters) {
        function convertValue(value) {
            return Date.isDate(value) ? Date.format(value, "MM/dd/yyyy HH:mm:ss") : value;
        }
        var paramDomain = {
            specifiedValues: 0,
            selectAll: 1,
            acceptingDynamicValues: 2
        };
        return (parameters || []).map(function(p) {
            if (p.multivalue) {
                var values = p.values.map(function(pv) {
                    return convertValue(pv.hasOwnProperty("value") ? pv.value : pv);
                }).filter(function(v) {
                    return null !== v && void 0 !== v;
                });
                return 1 == values.length && values[0] == ParameterSpecialValue.SelectAll ? {
                    Name: p.name,
                    Domain: paramDomain.selectAll,
                    Values: []
                } : {
                    Name: p.name,
                    Domain: paramDomain.specifiedValues,
                    Values: values
                };
            }
            return {
                Name: p.name,
                Domain: paramDomain.specifiedValues,
                Values: [ convertValue(p.value) ].filter(function(v) {
                    return null !== v && void 0 !== v;
                })
            };
        });
    }
    function arsParametersParser(resourceManager) {
        function convertDataType(value) {
            var map = {
                string: ParameterType.String,
                "boolean": ParameterType.Bool,
                bool: ParameterType.Bool,
                datetime: ParameterType.DateTime,
                integer: ParameterType.Int,
                "int": ParameterType.Int,
                "float": ParameterType.Float
            };
            return map[(value || "").toLowerCase()] || ParameterType.String;
        }
        function convertState(value) {
            var map = {
                hasvalidvalue: ParameterState.Ok,
                missingvalidvalue: ParameterState.ExpectValue,
                hasoutstandingdependencies: ParameterState.HasOutstandingDependencies,
                dynamicvaluesunavailable: ParameterState.DynamicValuesUnavailable
            };
            return map[(value || "").toLowerCase()] || ParameterState.Ok;
        }
        function parseValue(value, type) {
            if (null === value) return null;
            switch (type) {
              case ParameterType.Bool:
                return Boolean.parse(value);

              case ParameterType.Int:
              case ParameterType.Float:
                return "" === value ? null : +value;

              case ParameterType.DateTime:
                if ("" === value) return null;
                if (!Date.isDate(value)) {
                    var d = new Date();
                    return d.setTime(Date.parse(value)), d;
                }
                return value;
            }
            return value;
        }
        function parseSpecialValue(value, parameter) {
            var valueToLower = value.toLowerCase();
            return {
                label: function() {
                    return "blank" === valueToLower || "empty" === valueToLower ? resourceManager.get(valueToLower) : value;
                }(),
                value: function() {
                    switch (valueToLower) {
                      case "blank":
                      case "empty":
                        return parameter.type == ParameterType.String ? "" : null;

                      case "null":
                        return null;

                      case "unspecified":
                        return parameter.nullable ? null : void 0;

                      case "selectall":
                        return ParameterSpecialValue.SelectAll;

                      default:
                        return value;
                    }
                }()
            };
        }
        function resolveEditor(p) {
            return p.multiline && p.type == ParameterType.String ? ParameterEditorType.MultiLine : p.multivalue ? ParameterEditorType.MultiValue : p.definesValidValues && p.availableValues.length > 0 ? ParameterEditorType.SelectOneFromMany : ParameterEditorType.SingleValue;
        }
        function ars_parseParametersXml(xml) {
            function parseValuesElement(e, parameter) {
                return $(e).children().map(function() {
                    var $this = $(this), stringValue = $this.text(), attrs = (stringValue.toLowerCase(),
                    $this.attrs()), isSpecial = Boolean.parse(attrs.isspecial);
                    return isSpecial ? parseSpecialValue(stringValue, parameter) : {
                        label: attrs.label || stringValue,
                        value: parseValue(stringValue, parameter.type)
                    };
                }).get();
            }
            function isDateOnlyDateDomain(dateDomain) {
                return "Day" == dateDomain || "Month" == dateDomain || "MonthFixedYear" == dateDomain || "Year" == dateDomain;
            }
            return $(xml).find("Parameter").map(function() {
                var $this = $(this), attrs = $this.attrs(), multivalue = Boolean.parse(attrs.multivalue), parameter = {
                    name: attrs.name || "",
                    type: convertDataType(attrs.datatype),
                    hidden: Boolean.parse(attrs.hidden),
                    multivalue: multivalue,
                    multiline: Boolean.parse(attrs.multiline || "false"),
                    allowEmpty: Boolean.parse(attrs.allowblank),
                    dateOnly: isDateOnlyDateDomain(attrs.datedomain),
                    nullable: Boolean.parse(attrs.nullable) && !multivalue,
                    prompt: attrs.prompt || attrs.name || "",
                    state: convertState(attrs.state),
                    promptUser: Boolean.parse(attrs.promptuser),
                    definesValidValues: Boolean.parse(attrs.definesvalidvalues),
                    selectAllEnabled: Boolean.parse(attrs.selectallenabled),
                    dateDomain: attrs.datedomain || "",
                    hasDependantParameters: $this[0].getElementsByTagName("DependentParameters").length > 0
                };
                return $.each(this.childNodes, function() {
                    switch (this.nodeName.toLowerCase()) {
                      case "values":
                        parameter.values = parseValuesElement(this, parameter);
                        break;

                      case "validvalues":
                        parameter.availableValues = parseValuesElement(this, parameter);
                    }
                }), parameter.values = parameter.values || [], parameter.value = parameter.values.length ? parameter.values[0].value : null,
                parameter.editor = resolveEditor(parameter), parameter.error = "", parameter;
            }).get();
        }
        function convertServerParameters(parameters) {
            function parseAvailableValues(values, dataType) {
                return values.map(function(v) {
                    return {
                        label: v.Label || v.Value,
                        value: parseValue(v.Value, dataType)
                    };
                });
            }
            function parseValues(values, parameter) {
                return values.map(function(v) {
                    if (v.IsSpecial) return parseSpecialValue(v.Value, parameter);
                    var value = parseValue(v.Value, parameter.type), expectedValues = parameter.availableValues.filter(function(av) {
                        return av.value === value;
                    });
                    return {
                        label: expectedValues && expectedValues.length && expectedValues[0].label || v.Value,
                        value: value
                    };
                });
            }
            return parameters.map(function(p) {
                var parameter = {
                    name: p.Name || "",
                    type: convertDataType(p.DataType),
                    hidden: p.Hidden,
                    multivalue: p.MultiValue,
                    multiline: p.MultiLine || !1,
                    allowEmpty: p.AllowBlank,
                    dateOnly: p.DateOnly,
                    nullable: p.Nullable && !p.MultiValue,
                    prompt: p.Prompt || p.Name || "",
                    state: convertState(p.State),
                    definesValidValues: p.DefinesValidValues,
                    selectAllEnabled: p.SelectAllEnabled,
                    hasDependantParameters: !(!p.DependentParameters || !p.DependentParameters.length)
                };
                return parameter.availableValues = parseAvailableValues(p.AvailableValues || [], parameter.type),
                parameter.values = parseValues(p.Values || [], parameter), parameter.state == ParameterState.Ok && parameter.values && 1 == parameter.values.length && "Unspecified" == parameter.values[0].label && (parameter.state = ParameterState.ExpectValue),
                parameter.value = parameter.values.length ? parameter.values[0].value : null, parameter.editor = resolveEditor(parameter),
                parameter.error = "", parameter;
            });
        }
        return {
            convertServerParameters: convertServerParameters,
            parseParametersXml: ars_parseParametersXml
        };
    }
    function ArsReportService(options, resourceManager) {
        function documentBase(html) {
            var doc = $("<div/>");
            doc.html(html);
            var style = doc.find("style");
            if (style.length) {
                var text = style.text();
                text = text.replace(/background-image\s*:\s*url\((.*)\)/g, function(match, url) {
                    return url = url.replace(/&amp;/g, "&"), url = isAbsoluteUri(url) ? url : joinPath(resourceHandler, url),
                    "background-image:url({0})".format(url);
                }), style.text(text);
            }
            doc.find("img").each(function() {
                var $this = $(this), src = $this.attr("src");
                isBase64(src) || isAbsoluteUri(src) || (src.indexOf("?") >= 0 && (src += "&MobileGet=1"),
                $this.attr("src", joinPath(resourceHandler, src)));
            });
            var tocUrl = doc.find("meta[name=tocUrl]").attr("content"), documentId = doc.find("meta[name=DocumentId]").attr("content");
            return {
                html: doc,
                tocUrl: tocUrl,
                documentId: documentId
            };
        }
        function pageDocument(token, html) {
            function getPage(index) {
                var page = html.clone();
                return page.children("div").children("div.page").not(function(i) {
                    return i == index;
                }).remove(), page.html();
            }
            function exportType(extension) {
                switch (extension) {
                  case "Xls":
                    return "Excel";

                  default:
                    return extension;
                }
            }
            var $base = documentBase(html);
            html = $base.html, html.find("div.page").children().filter(function() {
                return "absolute" === $(this).css("position");
            }).css("position", "relative").css("left", "").css("top", "");
            var pages = html.find("div.page").length;
            return $.extend($base, {
                reportToken: token,
                pages: pages,
                getPage: getPage,
                exportType: exportType
            });
        }
        function pageStream(token, stream) {
            function getPage(index) {
                return pages[index].html();
            }
            function exportType(extension) {
                switch (extension) {
                  case "Xls":
                    return "Excel";

                  default:
                    return extension;
                }
            }
            var doc = documentBase(stream.firstPage.value), pages = [ doc.html ], pageCount = ko.observable({
                value: 1,
                done: !!stream.firstPage.done
            });
            return stream.onPage = function(result) {
                if (result.done) return void pageCount({
                    value: pages.length,
                    done: !0
                });
                var p = documentBase(result.value);
                pages.push(p.html), pageCount({
                    value: pages.length,
                    done: !1
                });
            }, stream.onError = function(err) {
                $(service).trigger("error", err);
            }, {
                tocUrl: doc.tocUrl,
                documentId: doc.documentId,
                reportToken: token,
                pages: pageCount,
                getPage: getPage,
                exportType: exportType
            };
        }
        function sectionDocument(token, html) {
            function getPage(index) {
                var page = html.clone();
                return page.children("div").not(function(i) {
                    return i == index;
                }).remove(), page.html();
            }
            function exportType(extension) {
                switch (extension) {
                  case "Xls":
                    return "Excel";

                  case "Word":
                    return "Rtf";

                  default:
                    return extension;
                }
            }
            var $base = documentBase(html);
            html = $base.html;
            var pages = html.children("div").length;
            return $.extend($base, {
                reportToken: token,
                pages: pages,
                getPage: getPage,
                exportType: exportType
            });
        }
        function close(async) {
            return state = {
                togglesHistory: null,
                documentId: null,
                hiddenParameters: []
            }, $base.promise(!0);
        }
        function open(reportId, parameters) {
            service.close();
            var idrev = (reportId || "").split("."), version = null;
            return 2 == idrev.length && (reportId = idrev[0], version = parseInt(idrev[1])),
            $base.getReport(reportId).then(function(list) {
                if (0 === list.length) return $base.errorPromise(SR("error.ReportNotFound").format(reportId));
                var desc = list[0];
                return version && (desc.Version = version), {
                    token: {
                        description: desc
                    },
                    parameters: [],
                    hasParameters: !!desc.IsParametrized,
                    reportType: getReportType(desc.ReportType),
                    autoRun: !0
                };
            }).then(function(report) {
                return report.hasParameters || parameters && 0 !== parameters.length ? resolveParameters(report.token, parameters).then(function(resolvedParameters) {
                    return $.extend(report, {
                        parameters: resolvedParameters
                    });
                }) : report;
            });
        }
        function getReportType(arsReportType) {
            return arsReportType === reportTypes.SemanticReport || arsReportType === reportTypes.PageReport ? ReportType.pageReport : arsReportType === reportTypes.SectionReport || arsReportType === reportTypes.CodeBasedReport ? ReportType.sectionReport : ReportType.unknown;
        }
        function run(reportToken, parameters) {
            var description = reportToken.description, renderParameters = ars_convertClientParameters(overrideHiddenParameters(parameters));
            return $base.renderReport(description, renderParameters).then(function(html) {
                var document;
                return document = description.ReportType == reportTypes.SectionReport || description.ReportType == reportTypes.CodeBasedReport ? sectionDocument(reportToken, html) : "object" == typeof html && $.isFunction(html.onPage) ? pageStream(reportToken, html) : pageDocument(reportToken, html),
                state.togglesHistory = new TogglesHistory(), state.documentId = document.documentId,
                document;
            });
        }
        function overrideHiddenParameters(parameters) {
            var notOverriddenHiddenParameters = state.hiddenParameters.filter(function(hiddenParameter) {
                return !parameters.some(function(parameter) {
                    return parameter.name == hiddenParameter.name;
                });
            });
            return notOverriddenHiddenParameters.concat(parameters);
        }
        function resolveParameters(reportToken, parameters) {
            return $base.resolveParameters(reportToken.description, ars_convertClientParameters(overrideHiddenParameters(parameters))).then(function(parsedParameters) {
                var notHiddenParameters = [];
                return state.hiddenParameters = [], parsedParameters.forEach(function(parsedParameter) {
                    reportToken.description.ReportType == reportTypes.SemanticReport && (parsedParameter.state == ParameterState.Ok && parsedParameter.values && 1 == parsedParameter.values.length && "Unspecified" == parsedParameter.values[0].label && (parsedParameter.state = ParameterState.ExpectValue),
                    parsedParameter.nullable = !1), parsedParameter.hidden ? state.hiddenParameters.push(parsedParameter) : notHiddenParameters.push(parsedParameter);
                }), notHiddenParameters;
            });
        }
        function exportImpl(token, exportType, settings) {
            function translateSettings(ss) {
                var newSettings = {};
                return Object.keys(ss || {}).forEach(function(key) {
                    var val = ss[key];
                    switch (key) {
                      case "printing":
                        val && (exportType == ExportType.Pdf ? newSettings.PrintOnOpen = !0 : exportType == ExportType.Html && (newSettings = $.extend(newSettings, {
                            WebViewer: !0,
                            MhtOutput: !1,
                            RenderTocTree: !1,
                            OutputTOC: !1,
                            Interactivity: !1,
                            RenderMode: "Paginated",
                            Pagination: !0,
                            StyleStream: !1,
                            IncludePageMargins: !1,
                            Printing: !0
                        })));
                        break;

                      default:
                        newSettings[key] = val;
                    }
                }), newSettings;
            }
            if (!token) return $base.errorPromise(SR("error.InvalidReportToken"));
            var description = token.reportToken.description, exportOptions = {
                DocumentId: token.documentId ? token.documentId : state.documentId,
                ToggleHistory: state.togglesHistory.getSet(),
                ExtensionSettings: translateSettings(settings)
            };
            return $base.exportDocument(description, token.exportType(exportType), exportOptions).then(function(url) {
                return isAbsoluteUri(url) || (url = resourceHandler + url), url;
            });
        }
        function validateParameters(reportToken, parameters) {
            return resolveParameters(reportToken, parameters);
        }
        function getPageCount(document) {
            if (!document) return $base.errorPromise(SR("error.InvalidDocumentToken"));
            if (ko.isObservable(document.pages)) {
                var dfr = $.Deferred(), sub = document.pages.subscribe(function(result) {
                    result.done ? (dfr.resolve(result.value), sub.dispose()) : dfr.notify(result.value);
                });
                return dfr.promise();
            }
            return $base.promise(document.pages || 1);
        }
        function getPage(document, index) {
            return document ? (index >= document.pages && (index = 0), $base.promise(document.getPage(index))) : $base.errorPromise(SR("error.InvalidDocumentToken"));
        }
        function getToc(document) {
            if (!document) return $base.errorPromise(SR("error.InvalidDocumentToken"));
            var tocUrl = document.tocUrl;
            return tocUrl ? (tocUrl += "&MobileGet=1", getResource(tocUrl, !0).then(function(toc) {
                return toc;
            }).fail(function() {
                return emptyToc();
            })) : emptyToc();
        }
        function emptyToc() {
            return $base.promise({
                name: "$root",
                kids: []
            });
        }
        function loadResource(url) {
            return getResource(url).then(function(data, textStatus, xhr) {
                if (206 == xhr.status) {
                    var xml = $(data), requestId = xml.find("RequestId").text();
                    return requestId ? $base.getResourceId(requestId).then(loadResource) : $base.errorPromise(SR("error.InvalidRequestId"));
                }
                return data;
            });
        }
        function getResource(url, json) {
            return url += "&NoWrapper=1", isAbsoluteUri(url) || (url = resourceHandler + url),
            json ? $base.getJson(url) : $base.get(url);
        }
        function toggle(token, toggleInfo) {
            state.togglesHistory.toggle(toggleInfo.Data);
            var description = token.description, renderOptions = {
                DocumentId: state.documentId,
                Name: description.Name,
                ReportType: description.ReportType,
                ToggleHistory: state.togglesHistory.getSet(),
                ExtensionSettings: {
                    RenderMode: "Paginated",
                    NeedExportSupport: !0,
                    TocStream: !0,
                    IncludePageMargins: !0
                }
            };
            return $base.exportDocument(description, "Html", renderOptions).then(loadResource).then(function(html) {
                var count;
                if (description.ReportType == reportTypes.SectionReport || description.ReportType == reportTypes.CodeBasedReport) {
                    var sectionDoc = sectionDocument(token, html);
                    return getPageCount(sectionDoc).done(function(pagesCount) {
                        count = pagesCount;
                    }), {
                        url: sectionDoc,
                        pagesCount: count
                    };
                }
                var pageDoc = pageDocument(token, html);
                return getPageCount(pageDoc).done(function(pagesCount) {
                    count = pagesCount;
                }), {
                    url: pageDoc,
                    pagesCount: count
                };
            });
        }
        function drillthrough(token, link) {
            var drillInfo = parseDrillthroughLink(link);
            return drillInfo && drillInfo.reportName ? openDrillthrough(token, drillInfo.reportName, drillInfo.params) : $base.errorPromise(SR("error.InvalidDrillthroughLink").format(link));
        }
        function parseDrillthroughLink(link) {
            function parseParameters(str) {
                var result = [], parameters = splitEscaped(str, ";");
                return parameters.forEach(function(parameter) {
                    var keyValue = splitEscaped(parameter, "=");
                    if (keyValue.length > 1) {
                        var key = keyValue[0], value = keyValue[1];
                        if (key) {
                            var values = splitEscaped(value, ",");
                            values.length > 1 ? result.push({
                                name: key,
                                values: values.map(function(v) {
                                    return {
                                        value: v
                                    };
                                }),
                                multivalue: !0
                            }) : result.push({
                                name: key,
                                value: values[0]
                            });
                        }
                    }
                }), result;
            }
            var queryStart = link.indexOf("?");
            if (-1 == queryStart) return {
                reportName: "",
                params: []
            };
            var reportName = "", params = [], query = link.slice(queryStart + 1);
            return query.split("&").forEach(function(queryItem, i, _) {
                var parts = queryItem.split(/=(.*)/);
                parts.length < 2 || ("ReportId" == parts[0] ? reportName = decodeURIComponent(parts[1]) : "Parameters" == parts[0] && (params = parseParameters(decodeURIComponent(parts[1]))));
            }), {
                reportName: reportName,
                params: params
            };
        }
        function openDrillthrough(token, reportName, parameters) {
            return service.open(reportName, parameters).then(function(report) {
                var parametersValid = report.parameters.every(function(p) {
                    return p.state == ParameterState.Ok;
                });
                return parametersValid ? service.run(report.token, report.parameters).then(function(documentToken) {
                    return {
                        reportToken: report.token,
                        parameters: report.parameters,
                        documentToken: documentToken
                    };
                }) : {
                    reportToken: report.token,
                    parameters: report.parameters
                };
            });
        }
        var state, service;
        if (!options.url) throw new Error("options has no valid url");
        var SR = resourceManager && $.isFunction(resourceManager.get) ? resourceManager.get : identity, serviceUrl = options.url, resourceHandler = options.resourceHandler || "";
        serviceUrl.endsWith("/") || (serviceUrl += "/"), service = {
            open: open,
            close: close,
            run: run,
            validateParameters: validateParameters,
            validateParameter: function() {
                return $base.errorPromise(SR("error.NotSupported"));
            },
            validateParameterSupported: function() {
                return !1;
            },
            getPageCount: getPageCount,
            getPage: getPage,
            getToc: getToc,
            "export": exportImpl,
            drillthrough: drillthrough,
            toggle: toggle,
            ping: function() {
                return $base.promise(!1);
            }
        };
        var $base = options.url && -1 !== options.url.toLowerCase().indexOf("reportservice.svc") ? ArsWcfReportService(service, serviceUrl, options, resourceManager, loadResource) : ArsRestReportService(service, serviceUrl, options.securityToken, resourceManager, !!options.streamingEnabled), reportTypes = $base.reportTypes;
        return close(), service;
    }
    function ArsRestReportService(service, serviceUrl, securityToken, resourceManager, streamingEnabled) {
        function setAuthToken(ajaxOptions) {
            return securityToken && (ajaxOptions.headers = {
                AuthToken: securityToken
            }), ajaxOptions;
        }
        function getReport(reportId) {
            return $base.get("reports?selector=" + JSON.stringify({
                $or: [ {
                    _id: {
                        $eqi: reportId
                    }
                }, {
                    Name: {
                        $eqi: reportId
                    }
                } ]
            })).then(function(reports) {
                return reports.forEach(function(r) {
                    r.ReportType = r.Type;
                }, this), reports;
            });
        }
        function renderReport(description, parameters) {
            var renderOptions = {
                ExtensionName: "Html",
                ExtensionSettings: {
                    Target: "Screen",
                    RenderMode: "Paginated",
                    NeedExportSupport: !0,
                    IncludePageMargins: !0,
                    TocStream: !0,
                    SteamingEnabled: streamingEnabled
                },
                ReportParameters: parameters
            };
            if (streamingEnabled) {
                var dfr = $.Deferred(), req = {
                    method: "POST",
                    url: serviceUrl + "reports/" + description._id + "/stream/html",
                    headers: {
                        AuthToken: securityToken
                    },
                    body: JSON.stringify(renderOptions)
                }, stream = null;
                return window.fetchStream(req, function(page, err) {
                    if (null === stream) {
                        if (err) return void dfr.reject(err);
                        stream = {
                            firstPage: page,
                            onPage: noop,
                            onError: noop
                        }, dfr.resolve(stream);
                    } else {
                        if (err) return void stream.onError(err);
                        stream.onPage(page);
                    }
                }), dfr.promise();
            }
            return runTask("reports/" + description._id + "/renderingRequests", renderOptions).then(function(res) {
                return handleRequestResult("renderingRequests", res);
            });
        }
        function resolveParameters(description, parameters) {
            return runTask("reports/" + description._id + "/parameters/validateValues/v2", parameters).then(function(parameters) {
                return arsParametersParser(resourceManager).convertServerParameters(parameters);
            });
        }
        function exportDocument(description, extensionName, exportOptions) {
            return exportOptions.ExtensionName = extensionName, runTask("reports/" + description._id + "/exportRequests", exportOptions).then(function(res) {
                return handleRequestResult("exportRequests", res);
            });
        }
        function runTask(method, taskOptions) {
            return $base.postRest(method, taskOptions);
        }
        function handleRequestResult(requestType, result) {
            return null !== result && "object" == typeof result && result.RequestId ? getRequestResult(requestType, result.RequestId) : result;
        }
        function getRequestResult(requestType, requestId) {
            return $base.get("reports/" + requestType + "/" + requestId).then(function(res) {
                return handleRequestResult(requestType, res);
            });
        }
        function getResourceId(requestId) {
            return handleRequestResult("exportRequests", {
                RequestId: requestId
            });
        }
        var reportTypes = {
            SemanticReport: "SemanticReport",
            SectionReport: "SectionReport",
            PageReport: "PageReport",
            CodeBasedReport: "CodeBasedSectionReport"
        }, $base = ReportServiceBase(service, serviceUrl, setAuthToken);
        return {
            getReport: getReport,
            resolveParameters: resolveParameters,
            getResourceId: getResourceId,
            renderReport: renderReport,
            exportDocument: exportDocument,
            reportTypes: reportTypes,
            get: $base.get,
            getJson: $base.getJson,
            promise: $base.promise,
            errorPromise: $base.errorPromise
        };
    }
    function ArsWcfReportService(service, serviceUrl, options, resourceManager, loadResource) {
        function mapSettings(settings) {
            return Object.keys(settings || {}).map(function(key) {
                return {
                    Key: key,
                    Value: null === settings[key] ? null : settings[key].toString()
                };
            });
        }
        function post(method, data) {
            return data.token = options.securityToken, $base.post(method, data);
        }
        function getReport(reportId) {
            return post("Select", {}).then(function(list) {
                return list.filter(function(d) {
                    return d.Id == reportId || d.Name.toLowerCase() == reportId.toLowerCase();
                });
            });
        }
        function resolveParameters(description, parameters) {
            var renderOptions = {
                ReportId: description.Id,
                Name: description.Name,
                ReportType: description.ReportType,
                Extension: "Html",
                ReportParameters: parameters
            };
            return runTask("ResolveParameters", description, renderOptions).then(loadResource).then(function(resource) {
                return arsParametersParser(resourceManager).parseParametersXml(resource);
            });
        }
        function getResourceIdByRequestId(requestId) {
            return getResourceId({
                Info: {
                    State: requestStates.Running,
                    RequestId: requestId
                }
            });
        }
        function getResourceId(requestResult) {
            var requestInfo = requestResult.Info;
            switch (requestInfo.State) {
              case requestStates.Unavailable:
              case requestStates.Rejected:
                var err = (requestInfo.Exception || {}).Message || "";
                return $base.errorPromise(resourceManager("error.RequestRejected") + " " + err);

              case requestStates.Cancelled:
                return $base.errorPromise(resourceManager("error.RequestCancelled"));

              case requestStates.Pending:
              case requestStates.Running:
                return $base.delay(function() {
                    return post("GetRequestStatus", {
                        requestId: requestInfo.RequestId
                    });
                }, pollingTimeout).then(getResourceId);

              default:
                return encodeURI(requestInfo.PrimaryUrl + "&MobileGet=1");
            }
        }
        function renderReport(description, parameters) {
            var renderOptions = {
                ReportId: description.Id,
                Name: description.Name,
                ReportType: description.ReportType,
                Extension: "Html",
                ExtensionSettings: mapSettings({
                    Target: "Screen",
                    RenderMode: "Paginated",
                    NeedExportSupport: !0,
                    IncludePageMargins: !0,
                    TocStream: !0
                }),
                ReportParameters: parameters
            };
            return runTask("RenderReport", description, renderOptions).then(loadResource);
        }
        function exportDocument(description, extensionName, exportOptions) {
            return exportOptions.Extension = extensionName, exportOptions.ExtensionSettings = mapSettings(exportOptions.ExtensionSettings),
            runTask("ExportDocument", description, exportOptions);
        }
        function runTask(method, description, taskOptions) {
            return post(method, {
                description: description,
                options: taskOptions
            }).then(getResourceId);
        }
        var defaultPollingTimeout = 1e3, pollingTimeout = options.pollingTimeout || defaultPollingTimeout, reportTypes = {
            SemanticReport: 1,
            SectionReport: 2,
            PageReport: 3,
            CodeBasedReport: 4
        }, requestStates = {
            Pending: 0,
            Running: 1,
            Unavailable: 2,
            Accomplished: 3,
            Cancelled: 4,
            Rejected: 5
        }, $base = ReportServiceBase(service, serviceUrl);
        return {
            getReport: getReport,
            resolveParameters: resolveParameters,
            getResourceId: getResourceIdByRequestId,
            renderReport: renderReport,
            exportDocument: exportDocument,
            reportTypes: reportTypes,
            get: $base.get,
            getJson: $base.getJson,
            promise: $base.promise,
            errorPromise: $base.errorPromise
        };
    }
    function BrowserSpecific() {
        function isEdge() {
            return -1 != navigator.userAgent.indexOf("Edge");
        }
        return {
            PrintButtonVisibility: !isEdge()
        };
    }
    function ClientSideSearchService() {
        function search(document, searchOptions) {
            function fillResults(items, regex, numberOfMatches) {
                for (var fromIndex = currentPage == options.FromPage + 1 && options.FromElement > 0 ? options.FromElement + 1 : 0, i = fromIndex; i < items.length; i++) {
                    var element = items[i], elementText = element.text();
                    if (elementText.match(regex) && (result.matches.push({
                        idx: i,
                        text: elementText,
                        page: currentPage - 1
                    }), result.matches.length === numberOfMatches)) break;
                }
                return numberOfMatches != ALL_RESULTS && result.matches.length >= numberOfMatches;
            }
            function searchOnCurrentPage(regex) {
                var hasMorePages = document.state() === DocumentState.completed && document.pageCount() >= currentPage + 1;
                fillResults(cachedItems, regex, options.NumberOfResults) || !hasMorePages ? (result.hasMore = hasMorePages,
                d.resolve(result)) : document.state() === DocumentState.progress && document.pageCount() <= currentPage + 1 ? setTimeout(searchOnCurrentPage, 100) : getPageItems(document, currentPage).done(function(items) {
                    cachedItems = items, currentPage++, searchOnCurrentPage(regex);
                });
            }
            var d = $.Deferred(), result = {
                hasMore: !0,
                matches: []
            };
            if (null === searchOptions || void 0 === searchOptions) return d.resolve({
                hasMore: !1,
                matches: []
            });
            var options = ensureOptions(searchOptions);
            return 0 === options.FromPage && 0 === options.FromElement && (cachedItems = [],
            currentPage = 0), searchOnCurrentPage(createRegex(searchOptions)), d.promise();
        }
        function getPageItems(document, pageIndex) {
            return document.getPage(pageIndex).then(getStrippedTextElements);
        }
        function getStrippedTextElements(page) {
            return getTextElements(page, !0);
        }
        function ensureOptions(searchOptions) {
            var startFromPage = searchOptions && searchOptions.from && searchOptions.from.page || 0, startFromIndex = searchOptions && searchOptions.from && searchOptions.from.idx || 0, numberOfResults = searchOptions.maxSearchResults, maxResultCount = !numberOfResults || 0 > numberOfResults ? ALL_RESULTS : numberOfResults;
            return {
                FromPage: startFromPage,
                FromElement: startFromIndex,
                NumberOfResults: maxResultCount
            };
        }
        function createRegex(searchOptions) {
            for (var escapeChars = "\\|[]()+*.{}$^?", pattern = "", i = 0; i < searchOptions.text.length; i++) {
                var ch = searchOptions.text[i];
                escapeChars.indexOf(ch) >= 0 && (pattern += "\\"), pattern += ch;
            }
            searchOptions.wholePhrase && (pattern = "\\b" + pattern, pattern += "\\b");
            var flags = "m";
            return searchOptions.matchCase || (flags += "i"), new RegExp(pattern, flags);
        }
        var service = {
            search: search
        }, ALL_RESULTS = "ALL", cachedItems = [], currentPage = 0;
        return service;
    }
    function noop() {}
    function identity(v) {
        return v;
    }
    function isAbsoluteUri(uri) {
        return /^https?:\/\//i.test(uri);
    }
    function isBase64(uri) {
        var r = new RegExp("^data:\\w+/\\w+;base64,", "i");
        return r.test(uri);
    }
    function getQueryParameter(url, name) {
        if (!url || "string" != typeof url) return null;
        if (!name || "string" != typeof name) return null;
        var uri = parseUri(url);
        if (!uri.query) return null;
        var f = Object.keys(uri.queryKey).filter(function(key) {
            return key.toLowerCase() == name;
        });
        return 1 === f.length ? uri.queryKey[f[0]] : null;
    }
    function splitEscaped(str, delimiter) {
        if (null === str || void 0 === str) return [];
        if (!delimiter) return [ str ];
        if ("\\" == delimiter) throw new Error("\\ delimiter is not supported");
        if (delimiter.length > 1) throw new Error("delimiter should be single character");
        for (var res = [], part = "", escaped = !1, i = 0; i < str.length; ) {
            var current = str.charAt(i);
            escaped ? (part += current, escaped = !1) : "\\" == current ? escaped = !0 : current == delimiter ? (res.push(part),
            part = "") : part += current, i++;
        }
        return res.push(part), res;
    }
    function getDpi() {
        var e = document.body.appendChild(document.createElement("DIV"));
        e.style.width = "1in", e.style.padding = "0";
        var dpi = e.offsetWidth;
        return e.parentNode.removeChild(e), dpi;
    }
    function resolveErrorMessage(args, resourceManager) {
        var xhr = args[0];
        if (3 == args.length && xhr.status) {
            if (resourceManager && 404 == xhr.status) return resourceManager("error.NotFound");
            if (xhr.responseJSON && xhr.responseJSON.Message) return xhr.responseJSON.Message;
            if (xhr.responseJSON && xhr.responseJSON.Error) return xhr.responseJSON.Error;
            if (xhr.responseText) {
                var m = /<title>([^<]*)<\/title>/.exec(xhr.responseText);
                if (m) return m[1];
            }
            return xhr.statusText;
        }
        return xhr.statusText ? xhr.statusText : xhr;
    }
    function getTextElements(page, removeTextChilds) {
        var topLevelSelector = "div, p, td, li, span", pageObject = page instanceof jQuery ? page : $("<div/>").html(page), elements = pageObject.find(topLevelSelector);
        return removeTextChilds ? jQuery.map(elements, function(topLevelElement) {
            return $($(topLevelElement).clone().find(topLevelSelector).remove().end());
        }) : elements;
    }
    function joinPath() {
        var segments = [].slice.call(arguments);
        return segments.map(trimSlash).filter(identity).join("/");
    }
    function trimSlash(str) {
        var s = str;
        return s ? ("/" === s.charAt(0) && (s = s.substr(1)), "/" === s.charAt(s.length - 1) && (s = s.substr(0, s.length - 1)),
        s) : "";
    }
    function DocumentModel(reportService, token, reportType) {
        function _resolveActionItems(element) {
            return _actionItemsResolver.resolve(element, _reportType);
        }
        function getToc() {
            if (!reportService) return $.Deferred().resolve(emptyToc).promise();
            var result = $.Deferred();
            return _toc() === nullToc || _toc() == emptyToc ? reportService.getToc(token).done(result.resolve).fail(failHandler) : result.resolve(_toc()),
            result.promise();
        }
        function load() {
            _pageCount(0), _state(DocumentState.progress), reportService.getPageCount(token).progress(function(count) {
                _pageCount(count);
            }).done(function(count) {
                _pageCount(count), _state(DocumentState.completed);
            }).fail(setErrorState).fail(failHandler);
        }
        function setErrorState() {
            _state(DocumentState.error);
        }
        function failHandler() {
            var error = resolveErrorMessage(arguments);
            $(doc).trigger("error", error);
        }
        function getPage(index) {
            return !token || 0 > index || index >= _pageCount() ? $.Deferred().resolve("").promise() : reportService.getPage(token, index).fail(failHandler);
        }
        function exportImpl(exportType, settings) {
            if (!token || _pageCount() <= 0) throw new Error("document is not ready for export");
            return reportService["export"](token, exportType, settings).fail(failHandler);
        }
        var nullToc = {
            kids: []
        }, emptyToc = {
            kids: []
        }, _pageCount = ko.observable(0), _state = ko.observable(DocumentState.init), _toc = ko.observable(nullToc), _reportType = reportType, _actionItemsResolver = new ActionItemsResolver(), _search = reportService && reportService.search && reportService.search.apply ? function(searchOptions) {
            return reportService.search(token, searchOptions);
        } : function(searchService) {
            return function(searchOptions) {
                return searchService.search(doc, searchOptions);
            };
        }(new ClientSideSearchService()), doc = {
            get pageCount() {
                return _pageCount;
            },
            get state() {
                return _state;
            },
            getPage: getPage,
            getToc: getToc,
            get toc() {
                return reportService ? (_toc() === nullToc && (_toc(emptyToc), ko.waitFor(_state, function(state) {
                    return state == DocumentState.completed;
                }, function() {
                    return getToc().done(_toc);
                })), _toc) : _toc;
            },
            "export": exportImpl,
            search: _search,
            resolveActionItems: _resolveActionItems
        };
        return reportService && token && load(), doc;
    }
    function DocumentViewModel(viewer) {
        var _pageContent = ko.promise(function() {
            return this.document().getPage(this.pageIndex());
        }, viewer), _inProgress = ko.computed(function() {
            return viewer.report().busy();
        }), _parameterValidation = ko.computed(function() {
            return viewer.report().parameterValidation();
        });
        return {
            get pageContent() {
                return _pageContent;
            },
            get location() {
                return viewer.location;
            },
            get inProgress() {
                return _inProgress;
            },
            get parameterValidation() {
                return _parameterValidation;
            }
        };
    }
    function Enum() {}
    function ErrorPaneViewModel(viewer) {
        var _showErrorsPane = ko.computed(function() {
            return viewer.errors().length > 0;
        }), _showExtendedErrorInfo = ko.observable(!1), _lastError = ko.computed(function() {
            var nerr = viewer.errors().length;
            return nerr > 0 ? viewer.errors()[nerr - 1] : "";
        });
        return _showErrorsPane.subscribe(function(newValue) {
            newValue || _showExtendedErrorInfo(!1);
        }), {
            get visible() {
                return _showErrorsPane;
            },
            get lastError() {
                return _lastError;
            },
            get showErrorInfo() {
                return _showExtendedErrorInfo;
            },
            get errors() {
                return viewer.errors;
            },
            get showOnlyLastError() {
                return viewer.showOnlyLastError;
            },
            dismissErrors: function() {
                _showExtendedErrorInfo(!1), viewer.clearErrors();
            }
        };
    }
    function InteractivityProcessor(services) {
        function processActions(pageContent) {
            for (var count = onPageProcessed.length; onPageProcessed.length > 0; ) {
                var handler = onPageProcessed.pop();
                $.isFunction(handler) && handler(pageContent);
            }
            return count - onPageProcessed.length;
        }
        function processActionItem(actionItem, pageContent) {
            function pageBookmarkCustomHandler(item) {
                onPageProcessed.push(function(content) {
                    var elementToScroll = $(content).find("#" + item.target).first();
                    if (null !== elementToScroll) {
                        var viewerOffset = $(content).offset(), elementOffset = $(elementToScroll).offset(), elementToViewerOffset = {
                            top: elementOffset.top - viewerOffset.top,
                            left: elementOffset.left - viewerOffset.left
                        };
                        viewer.location(elementToViewerOffset);
                    }
                }), viewer.pageIndex() == item.pageNumber - 1 ? processActions(pageContent) : viewer.pageIndex(item.pageNumber - 1);
            }
            function sectionBookmarkCustomHandler(item) {
                function traverseTocTree(node, path, originalPromise) {
                    function traverseKids(kids, kidLabel, restPath) {
                        for (var i = 0; i < kids.length; i++) {
                            var kid = kids[i];
                            if (kid.name === kidLabel) return restPath.length > 0 ? traverseTocTree(kid, restPath, d) : d.resolve(kid);
                        }
                        return null;
                    }
                    var d = null === originalPromise || void 0 === originalPromise ? $.Deferred() : originalPromise;
                    if (null === node || void 0 === node) return d.resolve(null);
                    var label = path[0];
                    return void 0 !== node.name && node.name === label ? d.resolve(node) : (void 0 !== node.kids && (ko.isObservable(node.kids) ? ko.waitFor(node.kids, function(k) {
                        return k.length > 0;
                    }, function(newKids) {
                        traverseKids(newKids, label, path.slice(1, path.length));
                    }) : traverseKids(node.kids, label, path.slice(1, path.length))), d.promise());
                }
                traverseTocTree(tocPane.root(), item.label.split("\\")).done(function(node) {
                    null !== node && tocPane.navigate(node);
                });
            }
            function getClickHandler(item) {
                return function() {
                    var actionHandler = services.action;
                    if (jQuery.isFunction(actionHandler) && !actionHandler(item.actionType, item)) return !1;
                    switch (item.actionType) {
                      case ActionType.hyperlink:
                        window.open(item.url, "_blank");
                        break;

                      case ActionType.bookmark:
                        item.reportType === ReportType.pageReport ? pageBookmarkCustomHandler(item) : item.reportType === ReportType.sectionReport && sectionBookmarkCustomHandler(item);
                        break;

                      case ActionType.drillthrough:
                        viewer.drillthrough(item.drillthroughLink);
                        break;

                      case ActionType.toggle:
                        viewer.toggle(item.toggleInfo);
                    }
                    return !1;
                };
            }
            var itemElement = $(actionItem.element);
            itemElement.click(getClickHandler(actionItem));
        }
        var viewer = services.viewer, tocPane = services.tocPane, onPageProcessed = [];
        return {
            processActions: processActions,
            processActionItem: processActionItem
        };
    }
    function ParameterModel(p) {
        function isNullable() {
            return _nullable;
        }
        function getValue() {
            return _state == ParameterState.HasOutstandingDependencies ? null : null !== _value && void 0 !== _value ? _value : getValues() && getValues()[0] ? getValues()[0].value : null;
        }
        function setValue(newValue) {
            _value = newValue, _values = null, updateState();
        }
        function updateState() {
            isNullable() || null !== getValue() && void 0 !== getValue() || (_state = ParameterState.ExpectValue);
        }
        function getValues() {
            return _state == ParameterState.HasOutstandingDependencies ? [] : _values;
        }
        function setValues(newValues) {
            _values = newValues, _value = null, updateState();
        }
        var _nullable = p.nullable, _value = p.value, _state = p.state, _values = p.values, _name = p.name, _hidden = p.hidden, _availableValues = p.availableValues, _prompt = p.prompt, _multiline = p.multiline, _multivalue = p.multivalue, _allowEmpty = p.allowEmpty, _dateOnly = p.dateOnly, _type = p.type, _promptUser = p.promptUser, _definesValidValues = p.definesValidValues, _selectAllEnabled = p.selectAllEnabled, _dateDomain = p.dateDomain, _error = p.error, _editor = p.editor, _dependantParameterNames = p.dependantParameterNames, _hasDependantParameters = p.hasDependantParameters;
        return {
            updateState: updateState,
            get name() {
                return _name;
            },
            get hidden() {
                return _hidden;
            },
            get value() {
                return getValue();
            },
            set value(newValue) {
                setValue(newValue);
            },
            get values() {
                return getValues();
            },
            set values(newValues) {
                setValues(newValues);
            },
            get availableValues() {
                return _availableValues;
            },
            get prompt() {
                return _prompt;
            },
            get nullable() {
                return isNullable();
            },
            get multiline() {
                return _multiline;
            },
            get multivalue() {
                return _multivalue;
            },
            get allowEmpty() {
                return _allowEmpty;
            },
            get dateOnly() {
                return _dateOnly;
            },
            get type() {
                return _type;
            },
            get state() {
                return _state;
            },
            get promptUser() {
                return _promptUser;
            },
            get definesValidValues() {
                return _definesValidValues;
            },
            get selectAllEnabled() {
                return _selectAllEnabled;
            },
            get dateDomain() {
                return _dateDomain;
            },
            get error() {
                return _error;
            },
            get editor() {
                return _editor;
            },
            get dependantParameterNames() {
                return _dependantParameterNames;
            },
            get hasDependantParameters() {
                return (this.dependantParameterNames ? this.dependantParameterNames.length > 0 : !1) || !!_hasDependantParameters;
            },
            setClientValidationFailed: function(message) {
                _state = ParameterState.ClientValidationFailed, _error = message;
            },
            setOk: function() {
                _state = ParameterState.Ok, _error = "";
            }
        };
    }
    function ParameterPaneViewModel(services, viewer) {
        function runReport() {
            refreshAfterValidation = !1, viewer.report().run();
        }
        function refreshReport() {
            validating ? refreshAfterValidation = !0 : runReport();
        }
        if (!viewer) throw new ReferenceError("viewer is required here!");
        var _allViewsValid = ko.observable(!0), parameterViewModels = ko.observable([]), areAllParametersValid = ko.computed(function() {
            return viewer.report().allParametersValid() && _allViewsValid();
        }), parameterPaneVisible = ko.computed({
            read: function() {
                return viewer.sidebarState() === SidebarState.Parameters;
            },
            write: function(value) {
                viewer.sidebarState(value ? SidebarState.Parameters : SidebarState.Hidden);
            }
        });
        viewer.report.subscribe(function() {
            parameterViewModels([]);
        });
        var validating = !1, refreshAfterValidation = !1;
        ko.computed(function() {
            return viewer.report().parameters();
        }).subscribe(function(params) {
            function updateIsValid(_) {
                _allViewsValid(parameterViewModels().every(function(v) {
                    return 0 === v.errorText().length;
                }));
            }
            function parameterChanged(p) {
                validating = !0, viewer.report().validateParameter({
                    multivalue: p.multivalue,
                    name: p.name,
                    value: p.value,
                    values: p.values
                }).done(function() {
                    areAllParametersValid() && refreshAfterValidation && runReport();
                }).always(function() {
                    validating = !1;
                });
            }
            if (0 === parameterViewModels().length) {
                var paramModels = params.filter(function(p) {
                    return void 0 === p.promptUser || p.promptUser;
                }).map(function(p) {
                    return ParameterViewModel(services, p, parameterChanged, updateIsValid, viewer.report());
                });
                parameterViewModels(paramModels);
            } else parameterViewModels().forEach(function(paramModel) {
                var updated = params.filter(function(pp) {
                    return pp.name == paramModel.name;
                });
                1 == updated.length && paramModel.$update(updated[0]);
            });
        });
        var _canRefresh = ko.computed(function() {
            return areAllParametersValid() && !viewer.report().parameterValidation();
        });
        return {
            visible: parameterPaneVisible,
            isValid: areAllParametersValid,
            refreshReport: {
                exec: refreshReport,
                enabled: _canRefresh
            },
            refreshReportAndClose: {
                exec: function() {
                    viewer.sidebarState(SidebarState.Hidden), refreshReport();
                },
                enabled: _canRefresh
            },
            parameters: parameterViewModels
        };
    }
    function ParameterViewModel(services, param, parameterChanged, parameterUpdateIsValid, reportModel) {
        function equals(v1, v2) {
            return _parameterModel.type === ParameterType.DateTime ? v1 - v2 === 0 : v1 === v2;
        }
        function updateEnabled() {
            _enabled(_parameterModel.state != ParameterState.HasOutstandingDependencies && !reportModel.parameterValidation());
        }
        function updateParameter(p) {
            function createOptionViewModel(availableValue) {
                var option = ParameterOptionViewModel(availableValue);
                return option.selected.subscribe(function() {
                    onSelectedChanged(option);
                }), option;
            }
            if (_parameterModel = p, _value(p.value), _isValueNull(_parameterModel.nullable && null === p.value),
            updateEnabled(), _editor(p.editor), _values(p.values), p.multivalue && p.state != ParameterState.HasOutstandingDependencies && (p.setOk(),
            p.updateState()), _errorText(function(state, error) {
                var errorText = "";
                switch (state) {
                  case ParameterState.Ok:
                    return "";

                  case ParameterState.ExpectValue:
                    errorText = getResourceString("error.ExpectValue");
                    break;

                  case ParameterState.ValidationFailed:
                    errorText = getResourceString("error.ValidationFailed");
                    break;

                  case ParameterState.HasOutstandingDependencies:
                    return getResourceString("error.HasOutstandingDependencies");

                  case ParameterState.ClientValidationFailed:
                    return error;
                }
                return [ errorText, error ].filter(identity).join(": ");
            }(p.state, p.error)), "" !== _errorText() || _parameterModel.nullable || null !== _value() || _errorText(getResourceString("error.ExpectValue")),
            p.availableValues) {
                var optionModels = p.availableValues.map(function(av) {
                    var selected = _parameterModel.multivalue ? p.values.some(function(v) {
                        return equals(v.value, av.value);
                    }) : equals(av.value, p.value);
                    return createOptionViewModel({
                        value: av.value,
                        label: av.label,
                        selected: selected
                    });
                });
                if (_parameterModel.nullable && !_parameterModel.multivalue) {
                    var nullLabel = getResourceString("null");
                    optionModels.push(createOptionViewModel({
                        value: null,
                        label: nullLabel,
                        selected: _isValueNull()
                    }));
                }
                if (_parameterModel.selectAllEnabled) {
                    var label = getResourceString("selectAll");
                    optionModels.splice(0, 0, createOptionViewModel({
                        value: ParameterSpecialValue.SelectAll,
                        label: label,
                        selected: p.value === ParameterSpecialValue.SelectAll
                    }));
                }
                _options(optionModels), updateEnabled();
            }
        }
        function isValidDate(d) {
            return Date.isDate(d);
        }
        function convertToTyped(value, type) {
            if (null === value) return null;
            switch (type) {
              case ParameterType.Bool:
                if ("boolean" == typeof value) return value;
                if ("true" == value.toLowerCase()) return !0;
                if ("false" == value.toLowerCase()) return !1;
                throw new Error(getResourceString("error.ExpectBooleanValue"));

              case ParameterType.Int:
                if (value = parseInt(value, 10), isNaN(value)) throw new Error(getResourceString("error.ExpectNumericValue"));
                break;

              case ParameterType.Float:
                if ("" === value) return null;
                value.replace && (value = value.replace(",", "."));
                var notFiniteNumber = isNaN(value) || parseFloat(value) == 1 / 0 || parseFloat(value) == -(1 / 0);
                if (notFiniteNumber) throw new Error(getResourceString("error.ExpectNumericValue"));
                value = parseFloat(value);
                break;

              case ParameterType.DateTime:
                if (value = checkDateFormatYearOnly(value) ? new Date(parseInt(value), 0, 1) : checkDateFormat(value) ? new Date(value.replace(/-/g, "/").replace(/T/g, " ")) : new Date(value),
                !isValidDate(value)) throw new Error(getResourceString("error.ExpectDateValue"));
                break;

              default:
                value = value.toString();
            }
            return value;
        }
        function updateValue(newValue) {
            if (_isValueNull(_parameterModel.nullable && null === newValue), !(_parameterModel.type == ParameterType.DateTime & (checkDateFormatYearOnly(newValue) | checkDateFormat(newValue)) & !checkYear(newValue))) {
                try {
                    ParameterSpecialValue.notContains(newValue) && (newValue = convertToTyped(newValue, _parameterModel.type)),
                    _parameterModel.setOk();
                } catch (e) {
                    _parameterModel.setClientValidationFailed(e.message);
                }
                _value(newValue), parameterChanged({
                    name: _parameterModel.name,
                    value: newValue
                });
            }
        }
        function updateValues(newValues) {
            try {
                newValues = newValues.map(function(value) {
                    var resultValue = value.value;
                    return ParameterSpecialValue.notContains(resultValue) && (resultValue = convertToTyped(resultValue, _parameterModel.type)),
                    {
                        label: value.label,
                        value: resultValue
                    };
                }), _parameterModel.setOk();
            } catch (e) {
                _parameterModel.setClientValidationFailed(e.message);
            }
            _values(newValues), parameterChanged({
                multivalue: !0,
                name: _parameterModel.name,
                values: newValues,
                value: null
            });
        }
        function onSelectedChanged(option) {
            option.selected() && (option.value == ParameterSpecialValue.SelectAll ? _options().filter(function(o) {
                return o != option;
            }).forEach(function(o) {
                o.selected(!1);
            }) : _parameterModel.selectAllEnabled && _options().filter(function(o) {
                return o.value == ParameterSpecialValue.SelectAll;
            }).forEach(function(o) {
                o.selected(!1);
            }));
        }
        function checkDateFormat(value) {
            return null !== value ? /^[\d]{4}-[\d]{2}(-[\d]{2})?((T| )[\d]{2}:[\d]{2}(:[\d]{2})?)?$/.test(value) : !1;
        }
        function checkDateFormatYearOnly(value) {
            return null !== value ? /^[\d]{4}$/.test(value) : !1;
        }
        function checkYear(value) {
            if (null !== value) {
                var year = value.toString().split("-")[0];
                return year > 1e3 && 1e4 > year;
            }
            return !1;
        }
        var _parameterModel = param, _value = ko.observable(null), _isValueNull = ko.observable(!1), _enabled = ko.observable(!1), _errorText = ko.observable(""), _options = ko.observable([]), _values = ko.observable([]), _editor = ko.observable(ParameterEditorType.SingleValue), getResourceString = services.resourceManager && services.resourceManager.get || identity;
        reportModel.parameterValidation.subscribe(function() {
            updateEnabled();
        }), _errorText.subscribe(function(v) {
            parameterUpdateIsValid(0 === v.length);
        });
        var _dateTimePickerSuported, _isValueNullProperty = ko.computed({
            read: _isValueNull,
            write: function(v) {
                v ? updateValue(null) : _isValueNull(!1);
            }
        }), _valueProperty = ko.computed({
            read: _value,
            write: updateValue
        }), _stringValueProperty = ko.computed({
            read: function() {
                function toDateString(dt) {
                    return _parameterModel.dateOnly ? dt.toLocaleDateString() : dt.toLocaleString();
                }
                return _editor() == ParameterEditorType.MultiValue ? _values().map(function(v) {
                    return v.label;
                }).join(", ") : _editor() == ParameterEditorType.SelectOneFromMany ? _options().filter(function(o) {
                    return equals(o.value, _value());
                }).map(function(v) {
                    return v.label;
                }).join(", ") : null === _value() || void 0 === _value() ? "" : _parameterModel.type === ParameterType.DateTime && _value() instanceof Date ? toDateString(_value()) : _value().toString();
            },
            write: updateValue
        }), _isDateTimePickedSupported = function() {
            if (void 0 === _dateTimePickerSuported) {
                var element = document.createElement("input");
                element.setAttribute("type", "datetime-local"), _dateTimePickerSuported = "datetime-local" === element.type;
            }
            return _dateTimePickerSuported;
        }, _datePickerValueProperty = ko.computed({
            read: function() {
                function toDateString(dt) {
                    function pad(v) {
                        return ("0" + v).right(2);
                    }
                    var dateTimeDelimiter = _isDateTimePickedSupported() ? "T" : " ", dateString = dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
                    return _parameterModel.dateOnly ? dateString : dateString + dateTimeDelimiter + pad(dt.getHours()) + ":" + pad(dt.getMinutes()) + ":" + pad(dt.getSeconds());
                }
                return null !== _value() && void 0 !== _value() && _parameterModel.type === ParameterType.DateTime && _value() instanceof Date ? toDateString(_value()) : "";
            },
            write: updateValue
        }), _displayValueProperty = ko.computed({
            read: function() {
                return _parameterModel.nullable ? null === _value() ? getResourceString("null") : _stringValueProperty() : null === _value() || void 0 === _value() ? getResourceString("enterValue") : _stringValueProperty();
            }
        });
        return updateParameter(_parameterModel), {
            get prompt() {
                return _parameterModel.prompt;
            },
            get nullable() {
                return _parameterModel.nullable;
            },
            get type() {
                return _parameterModel.type;
            },
            get name() {
                return _parameterModel.name;
            },
            get editor() {
                return _editor;
            },
            get dateOnly() {
                return _parameterModel.dateOnly;
            },
            get enabled() {
                return _enabled;
            },
            get isValueNull() {
                return _isValueNullProperty;
            },
            get errorText() {
                return _errorText;
            },
            get value() {
                return _valueProperty;
            },
            get stringValue() {
                return _stringValueProperty;
            },
            get datePickerValue() {
                return _datePickerValueProperty;
            },
            get displayValue() {
                return _displayValueProperty;
            },
            get options() {
                return _options;
            },
            clearOptions: function() {
                _options().forEach(function(o) {
                    o.selected(!1);
                }), updateValues([]);
            },
            $update: updateParameter,
            $updateValuesFromModel: function(ok) {
                if (_parameterModel.multivalue && ok) {
                    var values = _options().filter(function(v) {
                        return v.selected();
                    }).map(function(v) {
                        return {
                            value: v.value,
                            label: v.label
                        };
                    });
                    updateValues(values);
                }
            }
        };
    }
    function ParameterOptionViewModel(availableValue) {
        var _selected = ko.observable(!!availableValue.selected);
        return {
            get label() {
                return availableValue.label || String(availableValue.value);
            },
            get value() {
                return availableValue.value;
            },
            get selected() {
                return _selected;
            }
        };
    }
    function PrintingService() {
        function printPdf(documentModel) {
            return documentModel["export"](ExportType.Pdf, {
                printing: !0
            }).done(function(uri) {
                var $iframe = $("#" + printingFrameId);
                0 === $iframe.length && ($iframe = $("<iframe/>"), $iframe.attr("id", printingFrameId),
                $iframe.css({
                    width: "1px",
                    height: "1px",
                    display: "none",
                    position: "fixed",
                    left: "0",
                    right: "0"
                }), $("body").append($iframe)), $iframe.attr("src", uri);
            });
        }
        var printingFrameId = "gc-viewer-print-frame";
        return {
            print: function(documentModel) {
                return printPdf(documentModel);
            }
        };
    }
    function convertPropertiesToJson(input) {
        function unescape(s) {
            return s = s.replace(/\\u(\d+)/g, function(match, ns) {
                return String.fromCharCode(parseInt(ns, 10));
            }), s = s.replace(/\\(.)/g, "all.js"), s.endsWith("\\") && (s = s.substr(0, s.length - 1)),
            s;
        }
        function parse(s) {
            var m = s.match(/((\\.|[^:=])+)[:=](.*)/);
            return m ? {
                key: unescape(m[1].trim()),
                value: unescape(m[3].trim())
            } : null;
        }
        if ("string" != typeof input || !input) return {};
        for (var lines = input.split(/\r?\n/g), output = {}, i = 0; i < lines.length; i++) {
            var l = lines[i].trim();
            if (l && !l.startsWith("#") && !l.startsWith("!")) {
                var p = parse(l);
                if (p) {
                    for (;l.endsWith("\\") && i + 1 < lines.length; ) l = lines[++i].trim(), p.value += unescape(l);
                    output[p.key] = p.value;
                }
            }
        }
        return output;
    }
    function ReportModel(reportService, reportInfo, busy, resourceManager) {
        function dispose(async) {
            if (_reportToken) {
                var token = _reportToken;
                _reportToken = null, _reportType = ReportType.unknown, _params([]), _state(ReportModelState.closed),
                reportService.close(token, async);
            }
        }
        function open() {
            reportInfo.id && (_reportToken = null, _reportType = ReportType.unknown, _busy(!0),
            reportService.open(reportInfo.id, reportInfo.parameters || []).done(function(rpt) {
                _reportToken = rpt.token, _reportType = rpt.reportType, _autoRun(!!rpt.autoRun),
                _params(rpt.parameters.map(function(serviceParameter) {
                    return ParameterModel(serviceParameter);
                }) || []), keepAlive(), _state(ReportModelState.open), rpt.autoRun && _allParametersValid() && run();
            }).fail(failHandler).always(function() {
                _autoRun() || _busy(!1), _allParametersValid() || _busy(!1);
            }));
        }
        function keepAlive() {
            _reportToken && reportService.ping(_reportToken).done(function(shouldContinue) {
                shouldContinue && setTimeout(function() {
                    keepAlive();
                }, pingTimeout);
            });
        }
        function failHandler() {
            var error = resolveErrorMessage(arguments, SR);
            _busy(!1), _state(ReportModelState.error), raiseError(error);
        }
        function raiseError(error) {
            $report.trigger("error", error);
        }
        function subscribeFirstPageLoaded(docModel) {
            docModel && (ko.waitFor(docModel.pageCount, function(pageCount) {
                return pageCount > 0;
            }, function() {
                _busy(!1);
            }), ko.waitFor(docModel.state, function(state) {
                return state == DocumentState.completed;
            }, function() {
                _busy(!1);
            }));
        }
        function run() {
            if (!_reportToken) throw new Error("Report is not opened!");
            if (!_allParametersValid()) throw new Error("Invalid parameters!");
            return validateParameters(_params()).done(function() {
                var allParametersOk = _params().every(function(p) {
                    return p.state == ParameterState.Ok;
                });
                return allParametersOk ? (_busy(!0), reportService.run(_reportToken, _params()).then(function(d) {
                    _state(ReportModelState.documentReady);
                    var dm = DocumentModel(reportService, d, _reportType);
                    subscribeFirstPageLoaded(dm), $report.trigger("documentReady", dm);
                }).fail(failHandler)) : $.Deferred().resolve();
            });
        }
        function validateParameters(parameters) {
            return parameters && parameters.length > 0 ? (_parameterValidation(!0), reportService.validateParameters(_reportToken, parameters).then(function(newParameters) {
                _params(newParameters.map(function(serviceParameter) {
                    return ParameterModel(serviceParameter);
                }));
            }).fail(raiseError).always(function() {
                _parameterValidation(!1);
            })) : $.Deferred().resolve();
        }
        function validateParameter(parameter) {
            var parameterFromModel = _params().filter(function(p) {
                return p.name == parameter.name;
            })[0];
            if (parameterFromModel.hasDependantParameters) {
                if (reportService.validateParameterSupported()) return reportService.validateParameter(_reportToken, parameter).then(function(updated) {
                    var newParameters = _params().map(function(parameterModel) {
                        var f = updated.filter(function(u) {
                            return u.name == parameterModel.name;
                        });
                        return 1 == f.length ? ParameterModel(f[0]) : parameterModel;
                    });
                    _params(newParameters);
                }).fail(raiseError);
                var parameters = _params().map(function(p) {
                    return p.name == parameter.name ? parameter : p;
                });
                return validateParameters(parameters);
            }
            return parameter.multivalue ? parameterFromModel.values = parameter.values : parameterFromModel.value = parameter.value,
            _params(_params()), $.Deferred().resolve();
        }
        function drillthrough(drillthroughLink) {
            return _busy(!0), reportService.drillthrough(_reportToken, drillthroughLink).then(function(result) {
                var parameterModels = result.parameters.map(function(serviceParameter) {
                    var parameterModel = ParameterModel(serviceParameter);
                    return parameterModel.setOk(), parameterModel.updateState(), parameterModel;
                }) || [], child = ReportModel(reportService, {
                    token: result.reportToken,
                    parameters: parameterModels,
                    docToken: result.documentToken,
                    reportType: ReportType.pageReport
                }, !0);
                child.keepAlive();
                var dm = result.documentToken ? DocumentModel(reportService, result.documentToken, ReportType.pageReport) : null;
                return child.subscribeFirstPageLoaded(dm), {
                    report: child,
                    document: dm
                };
            }).fail(raiseError).always(function() {
                _busy(!1);
            });
        }
        function toggle(toggleInfo) {
            return _busy(!0), reportService.toggle(_reportToken, toggleInfo).then(function(info) {
                return _state(ReportModelState.documentReady), $report.trigger("documentReady", DocumentModel(reportService, info.url, _reportType)),
                info;
            }).fail(raiseError).always(function() {
                _busy(!1);
            });
        }
        if (!reportService) throw new ReferenceError("ReportService is required here!");
        reportInfo = reportInfo || {};
        var pingTimeout = 6e4, SR = resourceManager && $.isFunction(resourceManager.get) ? resourceManager.get : identity, _busy = ko.observable(void 0 === busy ? !1 : busy), _parameterValidation = ko.observable(!1), _state = ko.observable(ReportModelState.noReport), _autoRun = ko.observable(!1), _reportToken = null, _params = ko.observable([]), _allParametersValid = ko.computed(function() {
            var parameters = _params();
            return parameters.every(function(p) {
                return p.state == ParameterState.Ok;
            });
        }), _hasPromptParams = ko.computed(function() {
            var parameters = _params();
            return parameters.filter(function(p) {
                return void 0 === p.promptUser || p.promptUser;
            }).length > 0;
        }), _reportType = ReportType.unknown, report = {
            get state() {
                return _state;
            },
            get busy() {
                return _busy;
            },
            get parameterValidation() {
                return _parameterValidation;
            },
            get parameters() {
                return _params;
            },
            get hasPromptParameters() {
                return _hasPromptParams;
            },
            get allParametersValid() {
                return _allParametersValid;
            },
            validateParameter: validateParameter,
            subscribeFirstPageLoaded: subscribeFirstPageLoaded,
            open: open,
            run: run,
            dispose: dispose,
            drillthrough: drillthrough,
            toggle: toggle,
            keepAlive: keepAlive,
            get autoRun() {
                return _autoRun;
            }
        }, $report = $(report);
        return reportInfo.id ? (_reportToken = null, _params([]), _reportType = ReportType.unknown,
        _state(ReportModelState.noReport)) : reportInfo.token && (_reportToken = reportInfo.token,
        _reportType = reportInfo.reportType, _params(reportInfo.parameters.map(function(parameter) {
            return ParameterModel(parameter);
        })), _state(reportInfo.docToken ? ReportModelState.documentReady : ReportModelState.open)),
        report;
    }
    function ReportServiceBase(service, serviceUrl, setSecurityToken) {
        function isUndefined(value) {
            return void 0 === value || null === value;
        }
        function setAuthToken(ajaxOptions) {
            return setSecurityToken && setSecurityToken(ajaxOptions), ajaxOptions;
        }
        function postService(url, data, skipError, async) {
            return postJson(url, data, skipError, async).then(function(msg) {
                return isUndefined(msg.d) ? invalidResponse(msg) : isUndefined(msg.d.Error) ? msg.d : skipError ? msg.d : errorPromise(msg.d.Error.Description || "ReportService fail!");
            }).fail(function() {
                var error = resolveErrorMessage(arguments);
                $(service).trigger("error", error);
            });
        }
        function postJson(url, data, skipError, async) {
            return isAbsoluteUri(url) || (url = serviceUrl + url), isUndefined(async) && (async = !0),
            $.ajax(setAuthToken({
                type: "POST",
                url: url,
                data: JSON.stringify(data),
                contentType: "application/json",
                async: async
            }));
        }
        function get(url) {
            return isAbsoluteUri(url) || (url = serviceUrl + url), $.ajax(setAuthToken({
                type: "GET",
                url: url
            })).then(function(data, status, xhr) {
                return $.Deferred(function(d) {
                    d.resolve(data, status, xhr);
                });
            }, failCallback);
        }
        function getJson(url) {
            return isAbsoluteUri(url) || (url = serviceUrl + url), $.ajax(setAuthToken({
                type: "GET",
                url: url,
                dataType: "json"
            })).then(function(data, status, xhr) {
                return $.Deferred(function(d) {
                    d.resolve(data, status, xhr);
                });
            }, failCallback);
        }
        function failCallback(error) {
            return 3 == arguments.length && arguments[0] && arguments[0].status && (error = getXhrErrorMessage(arguments[0])),
            error;
        }
        function getXhrErrorMessage(xhr) {
            var responseJson = xhr.responseJSON;
            if (!responseJson && xhr.responseText) try {
                responseJson = JSON.parse(xhr.responseText);
            } catch (e) {}
            return responseJson && responseJson.Message ? responseJson.Message : xhr.statusText;
        }
        function errorPromise(problem) {
            return $.Deferred(function(deferred) {
                deferred.reject(problem);
            }).promise();
        }
        function invalidResponse(value) {
            return errorPromise("Invalid response: " + JSON.stringify(value));
        }
        return {
            post: postService,
            postRest: postJson,
            get: get,
            getJson: getJson,
            errorPromise: errorPromise,
            invalidResponse: invalidResponse,
            invalidArg: function(name, value) {
                return errorPromise("Invalid argument {0}. Value: {1}".format(name, JSON.stringify(value)));
            },
            promise: function(value) {
                return $.Deferred(function(d) {
                    d.resolve(value);
                }).promise();
            },
            delay: function(promiseFn, timeout) {
                var def = $.Deferred();
                return setTimeout(function() {
                    promiseFn().done(function() {
                        def.resolve.apply(def, arguments);
                    }).fail(function() {
                        def.reject.apply(def, arguments);
                    });
                }, timeout), def.promise();
            }
        };
    }
    function ReportServiceSelector(options, resourceManager) {
        function realService() {
            return impl || (impl = options.securityToken ? ArsReportService(options, resourceManager) : ArReportService(options, resourceManager)),
            impl;
        }
        function delegate(method) {
            return function() {
                var args = arguments, service = realService();
                return service[method].apply(service, args);
            };
        }
        if (!options.url) throw new Error("options has no valid url");
        var impl, api = {};
        return [ "open", "close", "run", "validateParameters", "validateParameter", "getPageCount", "getPage", "getToc", "export", "search", "drillthrough", "toggle", "ping" ].forEach(function(method) {
            "function" == typeof realService()[method] && (api[method] = delegate(method));
        }), api.validateParameterSupported = function() {
            return impl && impl.validateParameterSupported();
        }, api;
    }
    function ResourceManager() {
        var embedded = {}, resources = {};
        embedded = {
            sidebar: "Sidebar",
            toc: "TOC",
            tocfull: "Table of Contents",
            firstPage: "First",
            lastPage: "Last",
            prevPage: "Prev",
            nextPage: "Next",
            print: "Print",
            backToParent: "Back to Parent",
            params: "Parameters",
            saveas: "Save As...",
            pdfDocument: "PDF Document",
            wordDocument: "Word Document",
            imageFile: "Image File",
            mhtDocument: "MHTML Web Archives",
            excelWorkbook: "Excel Workbook",
            yes: "Yes",
            no: "No",
            "true": "True",
            "false": "False",
            "null": "Null",
            "null-label": "Null value",
            on: "On",
            off: "Off",
            selectAll: "(select all)",
            enterValue: "Enter value",
            clearAllOptions: "Reset all",
            blank: "Blank",
            empty: "Empty",
            back: "Back",
            refreshReport: "View report",
            search: "Search",
            matchCase: "Match case",
            wholePhrase: "Whole phrase",
            more: "More...",
            noResults: "No results",
            clear: "Clear",
            findLabel: "Find:",
            "errorPane.Details": "Show details",
            "errorPane.HideDetails": "Hide details",
            "errorPane.DismissAll": "Dismiss all",
            "errorPane.ErrorPaneTitle": "An error(s) occured",
            "error.ExpectValue": "Value expected",
            "error.ValidationFailed": "Validation failed",
            "error.HasOutstandingDependencies": "Has outstanding dependencies.",
            "error.ExpectNumericValue": "Not a numeric value",
            "error.ExpectBooleanValue": "Not a boolean value",
            "error.ExpectDateValue": "Invalid date value",
            "error.NotSupported": "Operation is not supported.",
            "error.NotFound": "Not Found.",
            "error.ReportNotFound": "Unable to open report '{0}'.",
            "error.InvalidReportToken": "Invalid report token.",
            "error.InvalidDocumentToken": "Invalid document token.",
            "error.RequestFailed": "Your request failed.",
            "error.RequestRejected": "Your request was rejected.",
            "error.RequestCancelled": "Your request was cancelled.",
            "error.InvalidRequestId": "Invalid request id.",
            "error.InvalidDrillthroughLink": "Invalid drillthrough link '{0}'.",
            "error.InvalidDrillthroughParameters": "Invalid drillthrough parameters.",
            "error.InvalidResponse": "Invalid response.",
            "error.InvalidParameters": "Invalid report parameters",
            "error.DocumentNotInCache": "The document is not present in the cache. Please refresh the report.",
            "error.JsVersionsMismatch": "The version of GrapeCity.ActiveReports.Viewer.Html.js or GrapeCity.ActiveReports.Viewer.Html.min.js does not match the version of ActiveReports installed on the server side. Please update the javascript files in your application."
        };
        var manager;
        return manager = {
            get: function(key) {
                if (!key) return "";
                var value = "";
                return resources.hasOwnProperty(key) && (value = resources[key]), value || embedded[key] || "";
            },
            update: function(uri) {
                return "string" == typeof uri && uri ? $.get(uri).then(function(text) {
                    return "string" != typeof text ? !1 : (resources = convertPropertiesToJson(text),
                    $(manager).trigger("updated"), !0);
                }) : $.Deferred(function(d) {
                    d.reject("Invalid uri.");
                }).promise();
            }
        };
    }
    function SearchPaneViewModel(viewer, maxSearchResults, pageElement) {
        function _clear() {
            _searchString(""), _matchCase(!1), _wholePhrase(!1), _reset();
        }
        function _search() {
            _lastSearchOptions = {
                text: _searchString(),
                matchCase: _matchCase(),
                wholePhrase: _wholePhrase(),
                maxSearchResults: maxSearchResults
            }, _reset(), viewer.document().search(_lastSearchOptions).done(function(res) {
                _hasMore(res.hasMore), _searchResults(res.matches), _isReady(!0);
            });
        }
        function getOffsetRect(elem) {
            var box = elem.getBoundingClientRect(), body = document.body, docElem = document.documentElement, scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop, scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft, clientTop = docElem.clientTop || body.clientTop || 0, clientLeft = docElem.clientLeft || body.clientLeft || 0, top = box.top + scrollTop - clientTop, left = box.left + scrollLeft - clientLeft;
            return {
                top: Math.round(top),
                left: Math.round(left)
            };
        }
        function _navigate(searchResult) {
            viewer.pageIndex(searchResult.page);
            var location = searchResult.location || getItemLocation(searchResult.idx, $("div.document-view", pageElement));
            viewer.location({
                left: location.left,
                top: location.top
            }), highlightSearchResult(location);
        }
        var _searchString = ko.observable(), _matchCase = ko.observable(!1), _wholePhrase = ko.observable(!1), _isReady = ko.observable(), _searchResults = ko.observableArray([]), _hasMore = ko.observable(), _searchEnabled = ko.computed(function() {
            return _searchString() && viewer.document().state() !== DocumentState.init;
        }), _lastSearchOptions = null, _found = ko.computed(function() {
            return _isReady() && _searchResults().length > 0;
        }), _highlightEnabled = ko.observable(!1), _highlightLeft = ko.observable(0), _highlightTop = ko.observable(0), _highlightWidth = ko.observable(0), _highlightHeight = ko.observable(0), _pagePadding = 5 * getDpi() / 72, _reset = function() {
            _isReady(!1), _searchResults([]), _hasMore(!1), highlightSearchResult(!1);
        };
        viewer.document.subscribe(function() {
            _clear();
        }), ko.isObservable(viewer.pageIndex) && viewer.pageIndex.subscribe(function() {
            _highlightEnabled(!1);
        });
        var getItemLocation = function(idx, pageContainer) {
            var location = {
                left: 0,
                top: 0,
                width: 0,
                height: 0
            }, item = getTextElements(pageContainer, !1)[idx], rect = getOffsetRect(item), containerRect = getOffsetRect(pageContainer[0]);
            return rect.left && (location.left = rect.left - containerRect.left), rect.top && (location.top = rect.top - containerRect.top),
            location.width = item.offsetWidth, location.height = item.offsetHeight, location;
        }, highlightSearchResult = function(location) {
            return location ? (_highlightLeft(_pagePadding + location.left + "px"), _highlightTop(_pagePadding + location.top + "px"),
            _highlightWidth(location.width + "px"), _highlightHeight(location.height + "px"),
            _highlightEnabled(!0), void 0) : void _highlightEnabled(!1);
        }, searchVisible = ko.computed({
            read: function() {
                var visible = viewer.sidebarState() === SidebarState.Search;
                return visible || highlightSearchResult(!1), visible;
            },
            write: function(value) {
                viewer.sidebarState(value ? SidebarState.Search : SidebarState.Hidden);
            }
        });
        return {
            visible: searchVisible,
            get searchString() {
                return _searchString;
            },
            get searchResults() {
                return _searchResults;
            },
            get isReady() {
                return _isReady;
            },
            get matchCase() {
                return _matchCase;
            },
            get wholePhrase() {
                return _wholePhrase;
            },
            get hasMore() {
                return _hasMore;
            },
            get found() {
                return _found;
            },
            get highlightEnabled() {
                return _highlightEnabled;
            },
            get highlightLeft() {
                return _highlightLeft;
            },
            get highlightTop() {
                return _highlightTop;
            },
            get highlightWidth() {
                return _highlightWidth;
            },
            get highlightHeight() {
                return _highlightHeight;
            },
            search: {
                exec: _search,
                enabled: _searchEnabled
            },
            keyPressHandler: function(data, event) {
                return 13 == event.keyCode && _searchEnabled() && _search(), !0;
            },
            navigate: function(searchResult) {
                _navigate(searchResult);
            },
            navigateAndClose: function(searchResult) {
                viewer.sidebarState(SidebarState.Hidden), _navigate(searchResult);
            },
            more: function() {
                _lastSearchOptions.from = _searchResults()[_searchResults().length - 1], viewer.document().search(_lastSearchOptions).done(function(res) {
                    _hasMore(res.hasMore), $.each(res.matches, function(k, v) {
                        _searchResults.push(v);
                    });
                });
            },
            clear: {
                exec: _clear
            }
        };
    }
    function Templates(baseUri, resourceManager) {
        function get(name) {
            name = name.toLowerCase();
            var template = cache[name];
            if (template) return promise(template);
            var localName = name;
            return load(name).pipe(preprocess).pipe(function(html) {
                return cache[localName] = html, html;
            });
        }
        function getSync(name) {
            var result = "";
            return get(name).done(function(html) {
                return result = html, html;
            }), result;
        }
        function load(name) {
            var template = templates[name];
            if (template) return promise(template);
            var url = templateDir + name + ".html";
            return $.ajax({
                url: url,
                async: !1,
                dataType: "text"
            });
        }
        function preprocess(html) {
            return html = html.replace(/@include\s+"(\w+)"/g, function(match, name) {
                return getSync(name);
            }), html.replace(/%([\w_\.\-]+)%/g, function(match, key) {
                return resourceManager.get(key) || key;
            });
        }
        function promise(value) {
            return $.Deferred(function(d) {
                d.resolve(value);
            }).promise();
        }
        baseUri.endsWith("/") || (baseUri += "/");
        var templateDir = baseUri + "ui/", templates = {}, cache = {};
        return templates.custom = '<div class="ar-viewer custom" style="width: 100%; height: 100%">\n	@include "reportView"\n</div>',
        templates.desktop = '<div class="ar-viewer desktop" style="width: 100%; height: 100%" data-bind="resizeViewerBody: {}">\n	<!-- toolbar -->\n	<div class="btn-toolbar toolbar toolbar-top">\n		<div class="btn-group btn-group-sm">			\n			<button class="btn btn-default" data-bind="command: toolbar.sidebar" title="%sidebar%">\n				<span class="glyphicon glyphicon-list-alt" />\n			</button>			\n			<button class="btn btn-default" data-bind="command: toolbar.search" title="%search%">\n				<span class="glyphicon glyphicon-search" />\n			</button>\n		</div>\n\n		<div class="btn-group btn-group-sm">\n			<button class="btn btn-default" data-bind="command: toolbar.firstPage" title="%firstPage%">\n				<span class="glyphicon glyphicon-step-backward" />\n			</button>\n			<button class="btn btn-default" data-bind="command: toolbar.prevPage" title="%prevPage%">\n				<span class="glyphicon icon-large glyphicon-chevron-left" />\n			</button>\n			<div class="navbar-left input-group-sm">\n				<input class="form-control" type="text" data-bind="valueEdit: toolbar.pageNumber, enable: toolbar.pageNumberEnabled" />\n			</div>\n			<button class="btn btn-default" data-bind="	command: toolbar.nextPage" title="%nextPage%">\n				<span class="glyphicon icon-large glyphicon-chevron-right" />\n			</button>\n			<button class="btn btn-default" data-bind="command: toolbar.lastPage" title="%lastPage%">\n				<span class="glyphicon icon-large glyphicon-step-forward" />\n			</button>\n		</div>\n\n		<div class="btn-group btn-group-sm">\n			<button id="backToParent" class="btn btn-default" data-bind="command: toolbar.backToParent" title="%backToParent%">\n				<span class="glyphicon glyphicon-share-alt mirror-by-x" />\n			</button>\n		</div>\n		\n		<div class="btn-group btn-group-sm">\n			<button class="btn btn-default" data-bind="command: toolbar.print, visible: toolbar.printButtonVisibility" title="%print%">\n				<span class="glyphicon glyphicon-print" />\n			</button>\n		</div>\n\n		<div class="btn-group btn-group-sm" data-bind="visible: toolbar.exportsAreAvailable">\n			<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" data-bind="enable: toolbar.canExport">\n				%saveas%<span class="caret"></span>\n			</button>\n			<ul class="dropdown-menu" role="menu">\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Pdf\'), visible: toolbar.exportToAvailable(\'Pdf\')">%pdfDocument%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Word\'), visible: toolbar.exportToAvailable(\'Word\')">%wordDocument%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Image\'), visible: toolbar.exportToAvailable(\'Image\')">%imageFile%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Html\'), visible: toolbar.exportToAvailable(\'Html\')">%mhtDocument%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Xls\'), visible: toolbar.exportToAvailable(\'Xls\')">%excelWorkbook%</a></li>\n			</ul>\n		</div>\n	</div>\n\n	<div class="viewer-body" style="width: 100%">\n		<!-- sidebar -->\n		<div class="sidebar" data-bind="visible: sidebarState() != \'Hidden\'">\n			<ul class="nav nav-tabs">\n				<li data-bind="visible: hasToc, css: { \'active\': sidebarState() === \'TOC\' }"><a href="#gc-viewer-tab-toc" data-toggle="tab" data-bind="	click: function () { setSidebarState(\'TOC\') }">%toc%</a></li>\n				<li data-bind="visible: hasParameters, css: { \'active\': sidebarState() === \'Parameters\' }"><a href="#gc-viewer-tab-params" data-toggle="tab" data-bind="	click: function () { setSidebarState(\'Parameters\') }">%params%</a></li>\n				<li data-bind="css: { \'active\': sidebarState() === \'Search\' }" ><a href="#gc-viewer-tab-search" data-toggle="tab" data-bind="	click: function () { setSidebarState(\'Search\') }">%search%</a></li>\n			</ul>\n			<div class="tab-content" style="width: 100%" data-bind="activeTab: sidebarState">\n				<div id="gc-viewer-tab-toc" class="tab-pane toc-container" data-tab-name="TOC" data-bind="visible: hasToc">\n					@include "tocPane"\n				</div>\n				<div id="gc-viewer-tab-params" class="tab-pane" data-tab-name="Parameters" data-bind="visible: hasParameters, spin: document.parameterValidation">\n					@include "parametersPane"\n				</div>\n				<div id="gc-viewer-tab-search" class="tab-pane" data-tab-name="Search">\n					@include "searchPane"\n				</div>\n			</div>\n		</div>\n		@include "reportView"\n	</div>\n</div>',
        templates.errorpanel = '<!-- error panel for desktop mode data is bound to ViewerViewModel -->\n\n<div id="gcv-errorpane" class="errorpane alert alert-danger" data-bind="visible: errorPane.visible, with: errorPane">\n	<div data-bind="visible: !showErrorInfo()">\n		\n		<button id="gcv-details" type="button" class="btn btn-sm btn-danger pull-right"\n		        data-bind="click: function () { showErrorInfo(true); }, visible: !showOnlyLastError" >\n			<span>%errorPane.Details%</span>\n		</button>\n		\n		<span class="glyphicon glyphicon-warning-sign"></span>\n		<span id="gcv-lasterror" data-bind="text: lastError"></span>\n		<span class="badge" data-bind="text: errors().length > 1 ? errors().length : \'\'"></span>\n\n		<button id="placeholder" type="button" class="btn btn-sm" style="visibility: hidden;">&nbsp;</button>\n	</div>\n		\n	<!-- Extended error info -->\n	<div id="gcv-exterrinfo" data-bind="visible: showErrorInfo" style="overflow-y: auto; max-height: 200pt;">\n		<button id="gcv-hidedetails" type="button" class="btn btn-sm btn-danger pull-right" data-bind="click: function () { showErrorInfo(false); }" >\n			<span>%errorPane.HideDetails%</span>\n		</button>\n		\n		<span class="glyphicon glyphicon-warning-sign"></span>\n		<span>%errorPane.ErrorPaneTitle%</span>\n			\n		<ul data-bind="foreach: errors">\n			<li data-bind="text: $data"></li>\n		</ul>\n\n		<div style="text-align: right">\n			<button id="gcv-dismissall" type="button" class="btn btn-default btn-sm" data-bind="click: dismissErrors">\n				<span>%errorPane.DismissAll%</span>\n			</button>\n		</div>\n		\n	</div>\n</div>',
        templates.mobile = '<div class="ar-viewer mobile" style="width: 100%; height: 100%; position: relative" data-bind="resizeViewerBody: {}">\n	\n	<!-- top toolbar -->\n	<div class="btn-toolbar toolbar toolbar-top" style="width: 100%;">\n		<div class="btn-group">\n			<button class="btn btn-default" data-bind="command: toolbar.toc" title="%toc%">\n				<span class="glyphicon glyphicon-align-justify" />\n			</button>\n			<button class="btn btn-default" data-bind="command: toolbar.params" title="%params%" >\n				<span class="glyphicon glyphicon-cog" />\n			</button>\n			<button class="btn btn-default" data-bind="command: toolbar.search" title="%search%">\n				<span class="glyphicon glyphicon-search" />\n			</button>\n		</div>\n\n		<div class="btn-group" data-bind="visible: toolbar.exportsAreAvailable">\n			<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" data-bind="enable: toolbar.canExport" title="%saveas%">\n				<span class="glyphicon glyphicon-export" />\n			</button>\n			<ul class="dropdown-menu" role="menu">\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Pdf\'), visible: toolbar.exportToAvailable(\'Pdf\')">%pdfDocument%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Word\'), visible: toolbar.exportToAvailable(\'Word\')">%wordDocument%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Image\'), visible: toolbar.exportToAvailable(\'Image\')">%imageFile%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Html\'), visible: toolbar.exportToAvailable(\'Html\')">%mhtDocument%</a></li>\n				<li><a href="#" data-bind="command: toolbar.exportTo(\'Xls\'), visible: toolbar.exportToAvailable(\'Xls\')">%excelWorkbook%</a></li>\n			</ul>\n		</div>\n	</div>\n	\n	<div class="viewer-body" style="width: 100%;">\n		@include "reportView"\n	</div>\n	\n	<div class="panelsSite">\n		@include "mtocPane"\n		@include "msearchPane"\n		@include "mparametersPane"\n	</div>\n\n	<!-- bottom toolbar -->\n	<div class="btn-toolbar toolbar toolbar-bottom" style="width: 100%;">\n		<div class="btn-group">\n			<button class="btn btn-default" data-bind="command: toolbar.prevPage" title="%prevPage%">\n				<span class="glyphicon glyphicon-circle-arrow-left" />\n			</button>\n			<button class="btn btn-default" data-bind="command: toolbar.nextPage" title="%nextPage%">\n				<span class="glyphicon glyphicon-circle-arrow-right" />\n			</button>\n		</div>\n		\n		<div class="btn-group">\n			<div class="navbar-left">\n				<input class="form-control" type="text" data-bind="valueEdit: toolbar.pageNumber, enable: toolbar.pageNumberEnabled" tabindex="-1" />\n			</div>\n		</div>\n		\n		<div class="btn-group">\n			<button class="btn btn-default" data-bind="command: toolbar.backToParent" title="%backToParent%">\n				<span class="glyphicon glyphicon-share-alt mirror-by-x" />\n			</button>\n		</div>\n	</div>\n</div>\n',
        templates.mparameternullswitch = '<!-- ko if: nullable -->	\n<div style="margin-top: 5pt">\n	<label>%null-label%</label>\n	<div class="make-switch" style="vertical-align: middle" data-bind="bootstrapSwitch: isValueNull"\n			data-on-label="%yes%" data-off-label="%no%">\n		<input type="checkbox">\n	</div>\n</div>\n<!-- /ko -->\n',
        templates.mparameterspane = '<!-- parameters pane for mobile layout -->\n<div id="parametersPane" class="panel panel-default overlay" data-bind="showPanel: parametersPane.visible, spin: document.parameterValidation">\n	<div class="panel-heading" style="text-align: center">\n		<button type="button" class="close">&times;</button>\n		<h2 class="panel-title">%params%</h2>\n	</div>\n	<div class="panel-body">\n		<div class="params-pane" data-bind="foreach: parametersPane.parameters">\n				<h5 data-bind="text: prompt" />\n\n				<div class="param-value truncatedString well well-sm"\n					 data-bind="css: { \'has-error\': errorText().length > 0 }, attr: {pname: name},\n	showEditor: { template: \'parameter-editor-template\', placeholder: $($element).closest(\'.ar-viewer\').find(\'#paramEditorHere\'), enable: enabled, visible: enabled && $parent.visible, onClose: function (v) { $updateValuesFromModel(v); } }">\n					<i class="glyphicon glyphicon-play pull-right" data-bind="visible: enabled"></i>\n					<span data-bind="text: nullable && value() == null ? \'%null%\' : stringValue"></span>&nbsp;\n				</div>\n						\n				<div style="color: red" data-bind="visible: errorText().length > 0">\n					<span class="glyphicon glyphicon-exclamation-sign" />\n					<span data-bind="text: errorText" style="font-size: small" />\n				</div>\n		</div>\n\n		<button id="refresh-button" class="btn btn-block btn-default btn-primary" data-bind="command: parametersPane.refreshReportAndClose">\n			%refreshReport%\n		</button>\n	</div>\n</div>\n\n<div id="paramEditorHere" />\n\n<!-- single parameter editor form for mobile target platform -->\n<script type="text/html" id="parameter-editor-template">\n	<div class="panel panel-default overlay" style="z-index: 11;">\n		<div class="panel-heading" style="text-align: center; vertical-align: middle">\n			<button type="button"  class="btn close-onclick btn-default btn-sm pull-left">\n				<i class="glyphicon glyphicon-arrow-left" />\n			</button>\n			<button type="button" class="close">&times;</button>\n			<span class="panel-title" data-bind="text: prompt"></span>\n		</div>\n		<div class="panel-body">\n			<!-- ko if: editor() == \'SingleValue\' -->\n			<!-- ko if: type == \'bool\' -->		\n			<ul class="list-group">\n				<li class="list-group-item close-onclick" data-bind="click: function () { value(true); }">%true%\n					<i class="glyphicon glyphicon-ok pull-right" data-bind="visible: value"></i>\n				</li>\n				<li class="list-group-item close-onclick" data-bind="click: function () { value(false); }">%false%\n					<i class="glyphicon glyphicon-ok pull-right" data-bind="visible: value() === false"></i>\n				</li>\n				<!-- ko if: nullable -->\n				<li class="list-group-item close-onclick" data-bind="click: function () { isValueNull(true); }">%null%\n					<i class="glyphicon glyphicon-ok pull-right" data-bind="visible: isValueNull"></i>\n				</li>\n				<!-- /ko -->\n			</ul>\n			<!-- /ko -->\n\n			<!-- ko if: (type == \'datetime\' && dateOnly == true) -->\n			<input type="date" class="form-control" data-date-format="yyyy-mm-dd" min="1001-01-01" max="9999-12-31" data-bind="value: datePickerValue, attr: { pname: name }" />\n			<!-- /ko -->\n			<!-- ko if: (type == \'datetime\' && dateOnly == false) -->\n			<input type="datetime-local" step="1" class="form-control" data-date-format="yyyy-mm-dd hh:ii:ss" min="1001-01-01T00:00:00" max="9999-12-31T23:59:59" data-bind="value: datePickerValue, attr: { pname: name }" />\n			<!-- /ko -->\n\n			<!-- ko if: !(type == \'datetime\' || type == \'bool\') -->\n			<input type="text" class="form-control" data-bind="value: stringValue, attr: { pname: name }" />\n			<!-- /ko -->\n\n			<!-- ko if: type != \'bool\' && nullable -->	\n			@include "mparameterNullSwitch"\n			<!-- /ko -->\n\n			<!-- /ko -->\n			\n			<!-- ko if: editor() == \'SelectOneFromMany\' -->\n			<ul class="list-group" data-bind="foreach: options">\n				<li class="list-group-item close-onclick" data-bind="click: function () { $parent.value(value); }">\n					<span data-bind="text: label"></span>\n					<i class="glyphicon glyphicon-ok pull-right" data-bind="visible: selected"></i>\n				</li>\n			</ul>\n			<!-- /ko -->\n			\n			<!-- ko if: editor() == \'MultiValue\' -->\n			<ul class="list-group">\n				<!-- ko foreach: options -->	\n				<li class="list-group-item" data-bind="click: function() { selected(!selected()); }">\n					<span data-bind="text: label"></span>\n					<i class="glyphicon glyphicon-ok pull-right" data-bind="visible: selected"></i>\n				</li>\n				<!-- /ko -->\n				\n				<!-- TODO should be \'nullable\' but this does not work yet as server tells parameter is not nullable RdlxReportParameter.Nullable impl -->\n				<!-- ko if: true -->	\n				<li class="list-group-item" data-bind="click: function () { clearOptions(); }">\n					%clearAllOptions%\n				</li>\n				<!-- /ko -->\n			</ul>\n\n			<!-- /ko -->\n		\n			<!-- ko if: editor() == \'MultiLine\' -->\n			<textarea rows="5" class="form-control" data-bind="value: stringValue, enable: enabled, attr: { pname: name }" />\n			@include "mparameterNullSwitch"\n			<!-- /ko -->\n		\n			<div style="color: red" data-bind="visible: errorText().length > 0">\n				<span class="glyphicon glyphicon-exclamation-sign" />\n				<span data-bind="text: errorText" style="font-size: small" />\n			</div>\n\n		</div>\n	</div>\n</script>',
        templates.msearchpane = '<!-- template for search result item -->\n<div class="panel panel-default overlay" data-bind="showPanel: searchPane.visible">\n	<div class="panel-heading" style="text-align: center">\n		<button type="button" class="close">&times;</button>\n		<h2 class="panel-title">%search%</h2>\n	</div>\n	<div class="panel-body" data-bind="with: searchPane">\n		<div class="form-horizontal">\n			<input type="search" class="form-control" data-bind="value: searchString, valueUpdate: \'input\', event: { keypress: keyPressHandler }" />\n			<div class="form-group" style="margin: 4pt 4pt 0 4pt">\n				<label for="matchCase" class="control-label" style="vertical-align: middle">%matchCase%</label>\n				<div class="make-switch pull-right" data-bind="bootstrapSwitch: matchCase"\n				     data-on-label="%on%" data-off-label="%off%">\n					<input type="checkbox" id="matchCase"/>\n				</div>\n			</div>\n			<div class="form-group" style="margin: 4pt 4pt 0 4pt">\n				<label for="whole"  class="control-label"  style="vertical-align: middle">%wholePhrase%</label>\n				<div class="make-switch pull-right" data-bind="bootstrapSwitch: wholePhrase"\n				     data-on-label="%on%" data-off-label="%off%">\n					<input type="checkbox" id="whole"/>\n				</div>\n			</div>\n			<button class="btn btn-default btn-primary btn-block" data-bind="command: search" style="margin-top: 5pt">%search%</button>\n			<!-- ko if: isReady -->\n			<!-- ko if: found -->\n			<ul class="list-group toc" data-bind="foreach: searchResults" style="margin-top: 5pt">\n				<li class="list-group-item">\n					<div data-bind="click: $parent.navigateAndClose" class="truncatedString">\n						<i class="glyphicon glyphicon-chevron-right pull-right"></i>\n						<a data-bind="text: text" href="#"/>\n					</div>\n				</li>\n			</ul>\n			<button class="btn" data-bind="click: more, visible: hasMore">%more%</button>\n			<!-- /ko-->\n			<!-- ko ifnot: found -->\n			<span>%noResults%</span>\n			<!-- /ko-->\n			<!-- /ko -->\n		</div>\n	</div>\n</div>',
        templates.mtocpane = '<div class="panel panel-default overlay" data-bind="showPanel: tocPane.visible">\n	<div class="panel-heading">\n		<div class="btn-toolbar" style="text-align: center">\n			<button type="button" class="close" data-bind="click: function() { tocPane.reset(); tocPane.visible(false); }">&times;</button>\n			<a class="btn btn-default pull-left" title="%back%" data-bind="command: tocPane.back, visible: tocPane.back.enabled()">\n				<i class="glyphicon glyphicon-arrow-left" />\n			</a>\n			<span class="panel-title">%tocfull%</span>\n		</div>\n	</div>\n	<div class="panel-body" data-bind="with: tocPane.selectedNode">\n		<ul class="list-group toc" data-bind="foreach: kids">\n			<li class="list-group-item">\n				<div class="truncatedString" style="min-height: 1.2em" data-bind="click: function () { $root.tocPane.navigateAndClose($data); }">\n					<i class="glyphicon glyphicon-chevron-right pull-right"\n						data-bind="visible: !isLeaf, click: function(data, e) { e.stopImmediatePropagation(); $root.tocPane.select($data); }"></i>\n					<a data-bind="text: name" />\n				</div>\n			</li>\n		</ul>\n	</div>\n</div>\n',
        templates.parameterspane = '<!-- parameters pane for desktop layout -->\n<div class="panel-body" style="min-width: 120px">\n\n	<div data-bind="foreach: parametersPane.parameters">\n		<div style="margin-bottom: 10px;">\n			<label data-bind="text: prompt, tooltip: name"></label>\n\n			<div class="param-value" data-bind="css: { \'has-error\': errorText().length > 0 }, attr: { pname: name }">\n				<!-- ko if: editor() == \'SingleValue\' -->\n				<!-- ko if: type == \'bool\' -->\n				<label class="radio-inline">\n					<input type="radio" value="true" data-bind="checked: stringValue, enable: enabled" />%true%</label>\n				<label class="radio-inline">\n					<input type="radio" value="false" data-bind="checked: stringValue, enable: enabled" />%false%</label>\n				<label class="radio-inline" data-bind="visible: nullable">\n					<input type="radio" value="null" data-bind="click: function() { isValueNull(true); }, checked: isValueNull() ? \'null\' : stringValue(), enable: enabled" />%null%</label>\n				<!-- /ko -->\n				<!-- ko if: (type == \'datetime\' && dateOnly == true) -->\n				<input type="date" class="form-control" data-date-format="yyyy-mm-dd" min="1001-01-01" max="9999-12-31" data-bind="value: datePickerValue, enable: enabled" />\n				<!-- /ko -->\n				<!-- ko if: (type == \'datetime\' && dateOnly == false) -->\n				<input type="datetime-local" step="1" class="form-control" data-date-format="yyyy-mm-dd hh:ii:ss" min="1001-01-01T00:00:00" max="9999-12-31T23:59:59" data-bind="value: datePickerValue, enable: enabled" />\n				<!-- /ko -->\n				<!-- ko if: !(type == \'datetime\' || type == \'bool\') -->\n				<input type="text" class="form-control" data-bind="value: stringValue, enable: enabled" />\n				<!-- /ko -->\n				<!-- /ko -->\n\n				<!-- ko if: editor() == \'MultiLine\' -->\n				<textarea rows="5" class="form-control" data-bind="value: stringValue, enable: enabled" />\n				<!-- /ko -->\n\n				<!-- ko if: editor() == \'SelectOneFromMany\' -->\n				<div class="dropdown">\n					<a data-toggle="dropdown" class="dropdown-toggle form-control btn btn-default" style="text-align: left" data-bind="active: enabled">\n						<i class="glyphicon glyphicon-chevron-down pull-right"></i>\n						<div class="truncatedString" data-bind="text: displayValue"></div>\n					</a>\n					<ul class="dropdown-menu dropdown-menu-uniform-size" data-bind="foreach: options">\n						<li data-bind="click: function() { $parent.value(value); }">\n							<a tabindex="-1">\n								<i class="glyphicon glyphicon-ok pull-right" data-bind="visible: selected"></i>\n								<div class="truncatedString" data-bind="text: label"></div>\n							</a>\n						</li>\n					</ul>\n				</div>\n				<!-- /ko -->\n\n				<!-- ko if: editor() == \'MultiValue\' -->\n				<div class="dropdown" data-bind="dropdownForm: { onApply: function(v) { $updateValuesFromModel(v); }, onShown: function() { $($element).find(\'a:first span\').text(\'\'); } }">\n					<a data-toggle="dropdown" class="dropdown-toggle form-control btn btn-default" style="text-align: left" data-bind="active: enabled">\n						<i class="glyphicon glyphicon-chevron-down pull-right"></i>\n						<div class="truncatedString" data-bind="text: displayValue"></div>\n					</a>\n					<ul class="dropdown-menu dropdown-menu-uniform-size dropdown-menu-form">\n						<!-- ko foreach: options -->\n						<li data-bind="click: function() { selected(!selected()); }">\n							<a tabindex="-1">\n								<i class="glyphicon glyphicon-ok pull-right" data-bind="visible: selected"></i>\n								<div class="truncatedString" data-bind="text: label"></div>\n							</a>\n						</li>\n						<!-- /ko -->\n						<li data-bind="click: function() { clearOptions(); }">\n							<a tabindex="-1">\n								<div class="truncatedString">%clearAllOptions%</div>\n							</a>\n						</li>\n					</ul>\n				</div>\n				<!-- /ko -->\n\n				<span data-bind="visible: nullable && !(editor() == \'SingleValue\' && type == \'bool\') && editor() != \'SelectOneFromMany\'">\n					<input type="checkbox" data-bind="checked: isValueNull, enable: enabled">\n					<label>%null%</label>\n				</span>\n			</div>\n\n			<div style="color: red" data-bind="visible: errorText().length > 0">\n				<span class="glyphicon glyphicon-exclamation-sign" />\n				<span data-bind="text: errorText" style="font-size: small" />\n			</div>\n		</div>\n	</div>\n\n	<div>\n		<button id="refresh-button" class="btn btn-block btn-default btn-primary" data-bind="command: parametersPane.refreshReport">\n			%refreshReport%\n		</button>\n	</div>\n</div>\n',
        templates.reportview = '<div style="height: 100%; overflow: hidden; position: relative;" data-bind="spin: document.inProgress">\n	\n	@include "errorPanel"\n\n	<div style="width: 100%; height: 100%; padding: 5pt; overflow: auto; position: absolute;" \n		data-bind="scrollPosition: document.location" >\n		<div style="position: absolute;"  class="document-view" data-bind="htmlPage: { page: document.pageContent, onupdate: processPage }" />\n		<div style="position: absolute; background: blueviolet; opacity: 0.5; filter: alpha(opacity=50);" \n			data-bind="visible: searchPane.highlightEnabled, style: { left: searchPane.highlightLeft, top: searchPane.highlightTop, width: searchPane.highlightWidth, height: searchPane.highlightHeight }" />\n	</div>\n\n</div>\n',
        templates.searchpane = '<div class="panel-body" data-bind="with: searchPane">\n	<div>\n		<label class="control-label">%findLabel%</label>\n	</div>\n	<div>\n		<input type="search" class="form-control" data-bind="value: searchString, valueUpdate: \'input\', event: { keypress: keyPressHandler }"/>\n	</div>\n	<div style="margin-top: 5pt">\n		<input type="checkbox" data-bind="checked: matchCase" />\n		<label class="control-label">%matchCase%</label>\n	</div>\n	<div>\n		<input type="checkbox" data-bind="checked: wholePhrase" />\n		<label class="control-label">%wholePhrase%</label>\n	</div>\n	<div style="float: right">\n		<button class="btn btn-primary" data-bind="command: clear" style="margin: 1pt">%clear%</button>\n		<button class="btn btn-primary" data-bind="command: search" style="margin: 1pt">%search%</button>\n	</div>\n	<div style="clear: both">\n		<!-- ko if: isReady -->\n		<!-- ko if: found -->\n		<div data-bind="foreach: searchResults" style="margin-top: 5pt; border: 1pt solid black;">\n			<div class="truncatedString" data-bind="click: $parent.navigate" style="margin: 3pt;">\n				<a data-bind="text: text" href="#" />\n			</div>\n		</div>\n		<button class="btn" data-bind="click: more, visible: hasMore">%more%</button>\n		<!-- /ko-->\n		<!-- ko ifnot: found -->\n		<div style="margin: 5pt; padding: 5pt; border: 1pt solid black;">\n			%noResults%\n		</div>\n		<!-- /ko-->\n		<!-- /ko -->\n	</div>\n</div>\n',
        templates.tocpane = '<div data-bind="template: { name: \'toc-template\', data: tocPane.root }">\n</div>\n<script id="toc-node-template" type="text/html">\n	<li class="toc-node collapsed"\n		data-bind="css: { leaf: $data.isLeaf != false, branch: $data.isLeaf == false }, treeNode: { template: \'toc-template\', node: $data }">\n		<a class="toggle" href="#" data-bind="visible: $data.isLeaf == false"></a>\n		<a class="link" href="#" data-bind="text: name, click: function() { $root.tocPane.navigate($data); return false; }"></a>\n	</li>\n</script>\n<script id="toc-template" type="text/html">\n	<ul class="toc" data-bind="template: { name: \'toc-node-template\', foreach: $data.kids }"></ul>\n</script>',
        $(resourceManager).on("updated", function() {
            cache = {};
        }), {
            get: get
        };
    }
    function TocPaneViewModel(viewer) {
        function convertNode(node) {
            var promiseFn, kids;
            return $.extend({}, node, {
                kids: $.isFunction(node.kids) ? (kids = ko.observable([]), promiseFn = node.kids,
                ko.computed({
                    read: function() {
                        return promiseFn && promiseFn().done(function(newKids) {
                            promiseFn = null, kids(newKids.map(convertNode));
                        }), kids();
                    },
                    deferEvaluation: !0
                })) : (node.kids || []).map(convertNode)
            });
        }
        function reset() {
            _stack.removeAll(), _selectedNode(_root());
        }
        function _navigate(node) {
            reset(), viewer.pageIndex(node.page);
            var dpi = getDpi(), location = node.location || {
                left: 0,
                top: 0
            };
            viewer.location({
                left: location.left * dpi,
                top: location.top * dpi
            });
        }
        var _root = ko.computed(function() {
            return convertNode(viewer.document().toc());
        }), _selectedNode = ko.observable(_root()), _stack = ko.observableArray(), tocVisible = ko.computed({
            read: function() {
                return viewer.sidebarState() === SidebarState.TOC;
            },
            write: function(value) {
                viewer.sidebarState(value ? SidebarState.TOC : SidebarState.Hidden);
            }
        });
        return _root.subscribe(reset), {
            visible: tocVisible,
            get root() {
                return _root;
            },
            get selectedNode() {
                return _selectedNode;
            },
            navigateAndClose: function(node) {
                viewer.sidebarState(SidebarState.Hidden), _navigate(node);
            },
            navigate: function(node) {
                _navigate(node);
            },
            reset: reset,
            select: function(node) {
                _stack.push(_selectedNode()), _selectedNode(node);
            },
            back: {
                exec: function() {
                    var node = _stack.pop();
                    _selectedNode(node);
                },
                enabled: ko.computed(function() {
                    return _stack().length > 0;
                })
            }
        };
    }
    function TogglesHistory() {
        var togglesSet = [];
        this.toggle = function(toggleId) {
            var elementIndex = togglesSet.indexOf(toggleId);
            elementIndex > -1 ? togglesSet.splice(elementIndex, 1) : togglesSet.push(toggleId);
        }, this.getSet = function() {
            var result = togglesSet.slice();
            return result;
        };
    }
    function ToolbarViewModel(services, viewer) {
        function pageCount() {
            return viewer.document().pageCount();
        }
        var _pageNumber = ko.computed({
            read: function() {
                var inProgress = viewer.document().state() == DocumentState.progress, pc = pageCount();
                return 0 === pc ? "" : viewer.pageIndex() + 1 + "/" + pc + (inProgress ? "+" : "");
            },
            write: function(value) {
                var n = parseInt(value, 10);
                !isNaN(n) && n >= 1 && n <= pageCount() && viewer.pageIndex(n - 1);
            }
        });
        viewer.document.subscribe(function() {
            _lastSidebarState = null;
        }), _pageNumber.text = function() {
            return "" + (viewer.pageIndex() + 1);
        };
        var _lastSidebarState, _isDocReady = ko.computed(function() {
            return pageCount() > 0 && (viewer.document().state() === DocumentState.progress || viewer.document().state() === DocumentState.completed);
        }), _availableExports = ko.computed(function() {
            return viewer.availableExports().length > 0;
        }), _printButtonVisibility = services.browserSpecific.PrintButtonVisibility;
        return {
            printButtonVisibility: _printButtonVisibility,
            pageNumber: _pageNumber,
            pageNumberEnabled: ko.computed(function() {
                return pageCount() > 0;
            }),
            firstPage: {
                exec: function() {
                    viewer.pageIndex(0);
                },
                enabled: ko.computed(function() {
                    return pageCount() > 0 && 0 !== viewer.pageIndex();
                })
            },
            lastPage: {
                exec: function() {
                    viewer.pageIndex(pageCount() - 1);
                },
                enabled: ko.computed(function() {
                    return pageCount() > 0 && viewer.pageIndex() !== pageCount() - 1;
                })
            },
            prevPage: {
                exec: function() {
                    viewer.pageIndex(viewer.pageIndex() - 1);
                },
                enabled: ko.computed(function() {
                    return pageCount() > 0 && viewer.pageIndex() - 1 >= 0;
                })
            },
            nextPage: {
                exec: function() {
                    viewer.pageIndex(viewer.pageIndex() + 1);
                },
                enabled: ko.computed(function() {
                    return pageCount() > 0 && viewer.pageIndex() + 1 < pageCount();
                })
            },
            sidebar: {
                exec: function() {
                    viewer.sidebarState() !== SidebarState.Hidden ? (_lastSidebarState = viewer.sidebarState(),
                    viewer.sidebarState(SidebarState.Hidden)) : viewer.sidebarState(_lastSidebarState || (_isDocReady() || !viewer.report().hasPromptParameters() ? SidebarState.Search : SidebarState.Parameters));
                },
                enabled: !0
            },
            search: {
                exec: function() {
                    viewer.sidebarState(SidebarState.Search);
                },
                enabled: _isDocReady
            },
            toc: {
                exec: function() {
                    viewer.sidebarState(SidebarState.TOC);
                },
                enabled: ko.computed(function() {
                    return viewer.document().toc && viewer.document().toc().kids.length > 0;
                })
            },
            params: {
                exec: function() {
                    viewer.sidebarState(SidebarState.Parameters);
                },
                enabled: ko.computed(function() {
                    return viewer.report().hasPromptParameters();
                })
            },
            backToParent: {
                exec: function() {
                    viewer.sidebarState(SidebarState.Hidden), viewer.backToParent();
                },
                enabled: ko.computed(function() {
                    return viewer.backToParentEnabled();
                })
            },
            print: {
                exec: function() {
                    services.printingService.print(viewer.document());
                },
                enabled: ko.computed(function() {
                    return _isDocReady() && services.printingService;
                })
            },
            exportTo: function(exportType) {
                return {
                    exec: function() {
                        viewer.document()["export"](exportType, {
                            saveAsDialog: !0
                        }).done(function(uri) {
                            if (uri) {
                                var newWin = null;
                                try {
                                    newWin = window.open(uri);
                                } catch (e) {}
                                newWin || (window.location = uri);
                            }
                        }).fail(viewer.handleError);
                    },
                    enabled: _isDocReady
                };
            },
            exportToAvailable: function(exportType) {
                return viewer.availableExports().indexOf(exportType) >= 0;
            },
            get exportsAreAvailable() {
                return _availableExports;
            },
            get canExport() {
                return _isDocReady;
            }
        };
    }
    function ViewerImpl(services, options, viewModels) {
        function createReportModel() {
            viewerModel.report && documentReadySubscribe && (documentReadySubscribe.dispose(),
            documentReadySubscribe = null), viewerModel.report = ReportModel(reportService, options.report, null, resourceManager),
            options.reportLoaded && ko.waitFor(viewerModel.report().state, function(st) {
                return st === ReportModelState.open || st === ReportModelState.documentReady;
            }, function() {
                options.reportLoaded({
                    parameters: viewerModel.report().parameters()
                });
            });
        }
        function init() {
            options.report && createReportModel(), options.availableExports && viewerModel.availableExports(options.availableExports),
            options.localeUri ? optionMap.localeUri(options.localeUri) : updateTemplate();
        }
        function viewerElement() {
            return $(options.element);
        }
        function findElement(selector) {
            var $e = viewerElement().find(selector);
            return $e.length ? $e[0] : null;
        }
        function updateTemplate() {
            var uiType = options.uiType || "mobile";
            templates.get(uiType).done(function(html) {
                var $e = viewerElement();
                $e.html(html), ko.applyBindings(viewModel, $e.find(".ar-viewer")[0]);
            });
        }
        function optionImpl(name) {
            var invalid = function() {
                throw new Error("Ivalid option name: " + (name || "(null or undefined)"));
            };
            return (optionMap[name] || invalid).apply(null, Array.prototype.slice.call(arguments, 1));
        }
        function refresh() {
            viewerModel.clearErrors(), viewerModel.report().run();
        }
        function print() {
            var pc = viewerModel.document().pageCount();
            if (0 === pc) throw new Error("document is not ready for printing");
            if (!services.printingService) throw new Error("Printing service is not available");
            services.printingService.print(viewerModel.document()).fail(viewerModel.handleError);
        }
        function exportImpl(exportType, callback, saveAsDialog, settings) {
            var pc = viewerModel.document().pageCount();
            if (0 === pc) throw new Error("document is not ready for export");
            settings = settings || {}, settings.saveAsDialog = !!saveAsDialog, viewerModel.document()["export"](exportType, settings).done(callback || noop).fail(viewerModel.handleError);
        }
        function goToPage(number, offset, callback) {
            if (isNaN(number) || 0 >= number || number > viewerModel.document().pageCount()) throw new Error("The 'page' parameter must be integer in range 1..PageCount.");
            if (viewerModel.document().state() !== DocumentState.completed || 0 === viewerModel.document().pageCount()) throw new Error("Can't perform goToPage due to document state.");
            if (callback) var watcher = viewModel.document.pageContent.subscribe(function() {
                watcher.dispose(), callback();
            });
            viewerModel.pageIndex(number - 1), offset && viewerModel.location(offset);
        }
        function backToParent() {
            viewerModel.backToParent();
        }
        function search(searchTerm, searchOptions, callback) {
            if (viewerModel.document().state() !== DocumentState.completed) throw new Error("Can't perform search due to document state.");
            viewerModel.document().search({
                text: searchTerm,
                matchCase: searchOptions.matchCase,
                wholePhrase: searchOptions.wholePhrase,
                from: searchOptions.from,
                maxSearchResults: searchOptions.maxSearchResults || options.maxSearchResults
            }).done(callback || noop).fail(viewerModel.handleError);
        }
        function getToc(callback) {
            function toPromise(value) {
                return "function" == typeof value ? value() : $.Deferred().resolve(value).promise();
            }
            function traverseTocTree(node) {
                function traverseKids(kids) {
                    return $.when.apply($, kids.map(traverseTocTree));
                }
                var d = $.Deferred();
                return null === node || void 0 === node ? d.resolve($.extend({}, nullNode, {})) : node.isLeaf || !node.kids ? d.resolve($.extend({}, node, {})) : (toPromise(node.kids).then(function(kids) {
                    traverseKids(kids).then(function() {
                        d.resolve($.extend({}, node, {
                            kids: [].slice.call(arguments)
                        }));
                    });
                }), d);
            }
            var nullNode = {
                name: "",
                page: 0,
                location: {
                    left: 0,
                    top: 0
                },
                isLeaf: !0,
                kids: []
            };
            viewerModel.document().getToc().then(traverseTocTree).done(callback);
        }
        function destroy() {
            var $e = viewerElement();
            ko.cleanNode($e[0]), $e.html(""), viewerModel.clearReports(!1);
        }
        if (!options) throw new Error("Viewer options are not specified.");
        var documentReadySubscribe, reportService = services.reportService, resourceManager = services.resourceManager, templates = services.templates, viewerModel = viewModels.viewerModel, viewModel = viewModels.viewerViewModel, viewer = {
            destroy: destroy,
            option: optionImpl,
            refresh: refresh,
            print: print,
            "export": exportImpl,
            getToc: getToc,
            goToPage: goToPage,
            backToParent: backToParent,
            search: search,
            get pageCount() {
                return viewerModel.document().pageCount();
            },
            get currentPage() {
                return viewerModel.pageIndex() + 1;
            },
            get toolbar() {
                return findElement(".toolbar");
            },
            get toolbarTop() {
                return findElement(".toolbar-top");
            },
            get toolbarBottom() {
                return findElement(".toolbar-bottom");
            }
        }, optionMap = {
            uiType: function() {
                return arguments.length > 0 && (options.uiType = arguments[0], updateTemplate(options.uiType || "mobile", !1)),
                options.uiType;
            },
            report: function() {
                return arguments.length > 0 && (options.report = arguments[0], createReportModel()),
                options.report;
            },
            reportService: function() {
                return arguments.length > 0 && (options.reportService = arguments[0], reportService = ReportServiceSelector(options.reportService, resourceManager)),
                options.reportService;
            },
            localeUri: function() {
                if (arguments.length > 0) {
                    var uri = arguments[0];
                    if ("string" != typeof uri || !uri) throw new Error("Invalid locale URI.");
                    resourceManager.update(uri).done(function() {
                        options.localeUri = uri, updateTemplate();
                    }).fail(function(error) {
                        console.log("Unable to load locale from '{0}'. Error: {1}".format(uri, error));
                    });
                }
                return options.localeUri;
            },
            availableExports: function() {
                return arguments.length > 0 && viewerModel.availableExports(arguments[0]), viewerModel.availableExports();
            },
            action: function() {
                return arguments.length > 0 && (options.action = arguments[0]), options.action;
            },
            error: function() {
                return arguments.length > 0 && (options.error = arguments[0]), options.error;
            },
            reportLoaded: function() {
                return arguments.length > 0 && (options.reportLoaded = arguments[0]), options.reportLoaded;
            },
            documentLoaded: function() {
                return arguments.length > 0 && (options.documentLoaded = arguments[0]), options.documentLoaded;
            },
            maxSearchResults: function() {
                return arguments.length > 0 && (options.maxSearchResults = arguments[0]), options.maxSearchResults;
            },
            element: function() {
                if (arguments.length > 0) throw new Error("You can't change the element.");
                return options.element;
            }
        };
        return init(), viewer;
    }
    function ViewerModel(reportService, options) {
        function clearDrillthroughStack(async) {
            $(_drillthroughStack).each(function() {
                var drill = _drillthroughStack.pop();
                drill.Report.dispose(async);
            }), _backToParentEnabled(_drillthroughStack.length > 0);
        }
        function errorHandler(e, error) {
            viewer.handleError(error);
        }
        function setReport(value) {
            if (!value) throw new ReferenceError("value");
            _report() && ($(_report()).unbind("error", errorHandler), $(_report()).unbind("documentReady", onDocumentReady)),
            viewer.document = nullDocument, _report(value), $(value).on("error", errorHandler),
            $(value).on("documentReady", onDocumentReady), ko.waitFor(value.state, function(st) {
                return st == ReportModelState.open;
            }, function(st) {
                value.hasPromptParameters() ? value.autoRun() && value.allParametersValid() || _sidebarState(SidebarState.Parameters) : _sidebarState() === SidebarState.Parameters && _sidebarState(SidebarState.Hidden);
            });
        }
        function chain(fn1, fn2) {
            return function() {
                fn1 && fn1.apply && fn1(), fn2 && fn2.apply && fn2();
            };
        }
        function onDocumentReady(e, document) {
            viewer.document = document;
        }
        if (!reportService) throw new ReferenceError("reportService is required here!");
        var nullDocument = DocumentModel(), _pageIndex = ko.observable(0), _location = ko.observable({
            left: 0,
            top: 0
        }), _report = ko.observable(), _document = ko.observable(nullDocument), _sidebarState = ko.observable(SidebarState.Hidden), _availableExports = ko.observable([ ExportType.Pdf, ExportType.Word, ExportType.Image, ExportType.Html, ExportType.Xls ]), _drillthroughStack = [], _backToParentEnabled = ko.observable(!1), _errors = ko.observable([]), _showOnlyLastError = options ? options.showOnlyLastError : !1, unbindDocument = noop, viewer = {
            get pageIndex() {
                return _pageIndex;
            },
            get location() {
                return _location;
            },
            get sidebarState() {
                return _sidebarState;
            },
            get report() {
                return _report;
            },
            set report(value) {
                viewer.clearReports(!0), viewer.clearErrors(), setReport(value), value.state() === ReportModelState.noReport && value.open();
            },
            get document() {
                return _document;
            },
            set document(value) {
                if (!value) throw new ReferenceError("value");
                unbindDocument(), _document(value), $(value).on("error", errorHandler), unbindDocument = function() {
                    $(_document()).unbind("error", errorHandler);
                }, options && options.documentLoaded && (unbindDocument = chain(unbindDocument, ko.waitFor(ko.computed(function() {
                    return _document().state();
                }), function(val) {
                    return val === DocumentState.completed;
                }, options.documentLoaded))), _pageIndex(0), _location({
                    left: 0,
                    top: 0
                });
            },
            get availableExports() {
                return _availableExports;
            },
            set availableExports(value) {
                _availableExports(value || []);
            },
            drillthrough: function(drillthroughLink) {
                viewer.report().drillthrough(drillthroughLink).done(function(result) {
                    _drillthroughStack.push({
                        Report: viewer.report(),
                        Document: viewer.document()
                    }), _backToParentEnabled(_drillthroughStack.length > 0), setReport(result.report),
                    result.document && (viewer.document = result.document);
                });
            },
            toggle: function(toggleData) {
                var savedPageIndex = _pageIndex();
                return viewer.report().toggle(toggleData).then(function(info) {
                    savedPageIndex >= info.pagesCount && (savedPageIndex = info.pagesCount - 1), _pageIndex(savedPageIndex);
                });
            },
            backToParent: function() {
                if (0 === _drillthroughStack.length) throw new Error("Report stack is empty!");
                var oldReport = _report();
                oldReport && oldReport.dispose(!0);
                var drill = _drillthroughStack.pop();
                _backToParentEnabled(_drillthroughStack.length > 0), null !== drill && void 0 !== drill && (setReport(drill.Report),
                viewer.document = drill.Document);
            },
            get backToParentEnabled() {
                return _backToParentEnabled;
            },
            get errors() {
                return _errors;
            },
            get showOnlyLastError() {
                return _showOnlyLastError;
            },
            handleError: function(error) {
                if (error) {
                    var errorObject = {
                        message: String(error)
                    };
                    if (options && options.error && options.error.apply && options.error(errorObject)) return;
                    errorObject.message && _errors(_errors().concat([ String(errorObject.message) ]));
                }
            },
            clearReports: function(async) {
                clearDrillthroughStack(async);
                var oldReport = _report();
                oldReport && oldReport.dispose(async);
            },
            clearErrors: function() {
                _errors([]);
            }
        };
        return viewer.report = ReportModel(reportService), viewer;
    }
    function ViewerViewModel(services, options, viewer) {
        var _document = DocumentViewModel(viewer), _tocPane = TocPaneViewModel(viewer), _parametersPane = ParameterPaneViewModel(services, viewer), _searchPane = SearchPaneViewModel(viewer, options.maxSearchResults, options.element), _errorsPane = ErrorPaneViewModel(viewer), _toolbar = ToolbarViewModel(services, viewer), _paramsExists = ko.computed(function() {
            return viewer.report().parameters().filter(function(p) {
                return void 0 === p.promptUser || p.promptUser;
            }).length > 0;
        }), _hasToc = ko.computed(function() {
            return viewer.document().toc().kids.length > 0;
        }), _interactivityProcessor = InteractivityProcessor({
            viewer: viewer,
            tocPane: _tocPane,
            get action() {
                return options.action;
            }
        });
        return {
            get document() {
                return _document;
            },
            get toolbar() {
                return _toolbar;
            },
            get tocPane() {
                return _tocPane;
            },
            get parametersPane() {
                return _parametersPane;
            },
            get searchPane() {
                return _searchPane;
            },
            get errorPane() {
                return _errorsPane;
            },
            get sidebarState() {
                return viewer.sidebarState;
            },
            get hasParameters() {
                return _paramsExists;
            },
            get hasToc() {
                return _hasToc;
            },
            processPage: function(element) {
                $.each(viewer.document().resolveActionItems(element), function(index, item) {
                    _interactivityProcessor.processActionItem(item, element);
                }), _interactivityProcessor.processActions(element);
            },
            setSidebarState: function(state) {
                viewer.sidebarState(state);
            }
        };
    }
    function parseUri(str) {
        for (var o = parseUri.options, m = o.parser[o.strictMode ? "strict" : "loose"].exec(str), uri = {}, i = 14; i--; ) uri[o.key[i]] = m[i] || "";
        return uri[o.q.name] = {}, uri[o.key[12]].replace(o.q.parser, function(match, first, second) {
            first && (uri[o.q.name][first] = second);
        }), uri;
    }
    function createViewer(options) {
        var baseUri = options.baseUri || ".", resourceManager = ResourceManager(), reportService = ReportServiceSelector(options.reportService, resourceManager), templates = Templates(baseUri, resourceManager), printingService = PrintingService(), browserSpecific = BrowserSpecific(), services = {
            reportService: reportService,
            templates: templates,
            resourceManager: resourceManager,
            printingService: printingService,
            browserSpecific: browserSpecific
        }, viewerModel = ViewerModel(reportService, options);
        return ViewerImpl(services, options, {
            viewerModel: viewerModel,
            viewerViewModel: ViewerViewModel(services, options, viewerModel)
        });
    }
    !function($) {
        "use strict";
        $.fn.bootstrapSwitch = function(method) {
            var methods = {
                init: function() {
                    return this.each(function() {
                        var $div, $switchLeft, $switchRight, $label, color, moving, $element = $(this), myClasses = "", classes = $element.attr("class"), onLabel = "ON", offLabel = "OFF", icon = !1;
                        $.each([ "switch-mini", "switch-small", "switch-large" ], function(i, el) {
                            classes.indexOf(el) >= 0 && (myClasses = el);
                        }), $element.addClass("has-switch"), void 0 !== $element.data("on") && (color = "switch-" + $element.data("on")),
                        void 0 !== $element.data("on-label") && (onLabel = $element.data("on-label")), void 0 !== $element.data("off-label") && (offLabel = $element.data("off-label")),
                        void 0 !== $element.data("icon") && (icon = $element.data("icon")), $switchLeft = $("<span>").addClass("switch-left").addClass(myClasses).addClass(color).html(onLabel),
                        color = "", void 0 !== $element.data("off") && (color = "switch-" + $element.data("off")),
                        $switchRight = $("<span>").addClass("switch-right").addClass(myClasses).addClass(color).html(offLabel),
                        $label = $("<label>").html("&nbsp;").addClass(myClasses).attr("for", $element.find("input").attr("id")),
                        icon && $label.html('<i class="icon icon-' + icon + '"></i>'), $div = $element.find(":checkbox").wrap($("<div>")).parent().data("animated", !1),
                        $element.data("animated") !== !1 && $div.addClass("switch-animate").data("animated", !0),
                        $div.append($switchLeft).append($label).append($switchRight), $element.find(">div").addClass($element.find("input").is(":checked") ? "switch-on" : "switch-off"),
                        $element.find("input").is(":disabled") && $(this).addClass("deactivate");
                        var changeStatus = function($this) {
                            $this.siblings("label").trigger("mousedown").trigger("mouseup").trigger("click");
                        };
                        $element.on("keydown", function(e) {
                            32 === e.keyCode && (e.stopImmediatePropagation(), e.preventDefault(), changeStatus($(e.target).find("span:first")));
                        }), $switchLeft.on("click", function(e) {
                            changeStatus($(this));
                        }), $switchRight.on("click", function(e) {
                            changeStatus($(this));
                        }), $element.find("input").on("change", function(e) {
                            var $this = $(this), $element = $this.parent(), thisState = $this.is(":checked"), state = $element.is(".switch-off");
                            e.preventDefault(), $element.css("left", ""), state === thisState && (thisState ? $element.removeClass("switch-off").addClass("switch-on") : $element.removeClass("switch-on").addClass("switch-off"),
                            $element.data("animated") !== !1 && $element.addClass("switch-animate"), $element.parent().trigger("switch-change", {
                                el: $this,
                                value: thisState
                            }));
                        }), $element.find("label").on("mousedown touchstart", function(e) {
                            var $this = $(this);
                            moving = !1, e.preventDefault(), e.stopImmediatePropagation(), $this.closest("div").removeClass("switch-animate"),
                            $this.closest(".has-switch").is(".deactivate") ? $this.unbind("click") : ($this.on("mousemove touchmove", function(e) {
                                var $element = $(this).closest(".switch"), relativeX = (e.pageX || e.originalEvent.targetTouches[0].pageX) - $element.offset().left, percent = relativeX / $element.width() * 100, left = 25, right = 75;
                                moving = !0, left > percent ? percent = left : percent > right && (percent = right),
                                $element.find(">div").css("left", percent - right + "%");
                            }), $this.on("click touchend", function(e) {
                                var $this = $(this), $target = $(e.target), $myCheckBox = $target.siblings("input");
                                e.stopImmediatePropagation(), e.preventDefault(), $this.unbind("mouseleave"), moving ? $myCheckBox.prop("checked", !(parseInt($this.parent().css("left")) < -25)) : $myCheckBox.prop("checked", !$myCheckBox.is(":checked")),
                                moving = !1, $myCheckBox.trigger("change");
                            }), $this.on("mouseleave", function(e) {
                                var $this = $(this), $myCheckBox = $this.siblings("input");
                                e.preventDefault(), e.stopImmediatePropagation(), $this.unbind("mouseleave"), $this.trigger("mouseup"),
                                $myCheckBox.prop("checked", !(parseInt($this.parent().css("left")) < -25)).trigger("change");
                            }), $this.on("mouseup", function(e) {
                                e.stopImmediatePropagation(), e.preventDefault(), $(this).unbind("mousemove");
                            }));
                        });
                    });
                },
                toggleActivation: function() {
                    $(this).toggleClass("deactivate");
                },
                isActive: function() {
                    return !$(this).hasClass("deactivate");
                },
                setActive: function(active) {
                    active ? $(this).removeClass("deactivate") : $(this).addClass("deactivate");
                },
                toggleState: function(skipOnChange) {
                    var $input = $(this).find("input:checkbox");
                    $input.prop("checked", !$input.is(":checked")).trigger("change", skipOnChange);
                },
                setState: function(value, skipOnChange) {
                    $(this).find("input:checkbox").prop("checked", value).trigger("change", skipOnChange);
                },
                status: function() {
                    return $(this).find("input:checkbox").is(":checked");
                },
                destroy: function() {
                    var $checkbox, $div = $(this).find("div");
                    return $div.find(":not(input:checkbox)").remove(), $checkbox = $div.children(),
                    $checkbox.unwrap().unwrap(), $checkbox.unbind("change"), $checkbox;
                }
            };
            return methods[method] ? methods[method].apply(this, Array.prototype.slice.call(arguments, 1)) : "object" != typeof method && method ? void $.error("Method " + method + " does not exist!") : methods.init.apply(this, arguments);
        };
    }(jQuery), $(function() {
        $(".switch").bootstrapSwitch();
    }), function(factory) {
        factory(window.jQuery);
    }(function($) {
        $.fn.spin = function(opts, color) {
            return this.each(function() {
                var $this = $(this), data = $this.data();
                data.spinner && (data.spinner.stop(), delete data.spinner), opts !== !1 && (opts = $.extend({
                    color: color || $this.css("color")
                }, $.fn.spin.presets[opts] || opts), data.spinner = new Spinner(opts).spin(this));
            });
        }, $.fn.spin.presets = {
            tiny: {
                lines: 8,
                length: 2,
                width: 2,
                radius: 3
            },
            small: {
                lines: 8,
                length: 4,
                width: 3,
                radius: 5
            },
            large: {
                lines: 10,
                length: 8,
                width: 4,
                radius: 8
            }
        };
    }), !function(a, b) {
        window.Spinner = b();
    }(this, function() {
        "use strict";
        function a(a, b) {
            var c, d = document.createElement(a || "div");
            for (c in b) d[c] = b[c];
            return d;
        }
        function b(a) {
            for (var b = 1, c = arguments.length; c > b; b++) a.appendChild(arguments[b]);
            return a;
        }
        function c(a, b, c, d) {
            var e = [ "opacity", b, ~~(100 * a), c, d ].join("-"), f = .01 + c / d * 100, g = Math.max(1 - (1 - a) / b * (100 - f), a), h = j.substring(0, j.indexOf("Animation")).toLowerCase(), i = h && "-" + h + "-" || "";
            return m[e] || (k.insertRule("@" + i + "keyframes " + e + "{0%{opacity:" + g + "}" + f + "%{opacity:" + a + "}" + (f + .01) + "%{opacity:1}" + (f + b) % 100 + "%{opacity:" + a + "}100%{opacity:" + g + "}}", k.cssRules.length),
            m[e] = 1), e;
        }
        function d(a, b) {
            var c, d, e = a.style;
            if (b = b.charAt(0).toUpperCase() + b.slice(1), void 0 !== e[b]) return b;
            for (d = 0; d < l.length; d++) if (c = l[d] + b, void 0 !== e[c]) return c;
        }
        function e(a, b) {
            for (var c in b) a.style[d(a, c) || c] = b[c];
            return a;
        }
        function f(a) {
            for (var b = 1; b < arguments.length; b++) {
                var c = arguments[b];
                for (var d in c) void 0 === a[d] && (a[d] = c[d]);
            }
            return a;
        }
        function g(a, b) {
            return "string" == typeof a ? a : a[b % a.length];
        }
        function h(a) {
            this.opts = f(a || {}, h.defaults, n);
        }
        function i() {
            function c(b, c) {
                return a("<" + b + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', c);
            }
            k.addRule(".spin-vml", "behavior:url(#default#VML)"), h.prototype.lines = function(a, d) {
                function f() {
                    return e(c("group", {
                        coordsize: k + " " + k,
                        coordorigin: -j + " " + -j
                    }), {
                        width: k,
                        height: k
                    });
                }
                function h(a, h, i) {
                    b(m, b(e(f(), {
                        rotation: 360 / d.lines * a + "deg",
                        left: ~~h
                    }), b(e(c("roundrect", {
                        arcsize: d.corners
                    }), {
                        width: j,
                        height: d.scale * d.width,
                        left: d.scale * d.radius,
                        top: -d.scale * d.width >> 1,
                        filter: i
                    }), c("fill", {
                        color: g(d.color, a),
                        opacity: d.opacity
                    }), c("stroke", {
                        opacity: 0
                    }))));
                }
                var i, j = d.scale * (d.length + d.width), k = 2 * d.scale * j, l = -(d.width + d.length) * d.scale * 2 + "px", m = e(f(), {
                    position: "absolute",
                    top: l,
                    left: l
                });
                if (d.shadow) for (i = 1; i <= d.lines; i++) h(i, -2, "progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)");
                for (i = 1; i <= d.lines; i++) h(i);
                return b(a, m);
            }, h.prototype.opacity = function(a, b, c, d) {
                var e = a.firstChild;
                d = d.shadow && d.lines || 0, e && b + d < e.childNodes.length && (e = e.childNodes[b + d],
                e = e && e.firstChild, e = e && e.firstChild, e && (e.opacity = c));
            };
        }
        var j, k, l = [ "webkit", "Moz", "ms", "O" ], m = {}, n = {
            lines: 12,
            length: 7,
            width: 5,
            radius: 10,
            scale: 1,
            corners: 1,
            color: "#000",
            opacity: .25,
            rotate: 0,
            direction: 1,
            speed: 1,
            trail: 100,
            fps: 20,
            zIndex: 2e9,
            className: "spinner",
            top: "50%",
            left: "50%",
            shadow: !1,
            hwaccel: !1,
            position: "absolute"
        };
        if (h.defaults = {}, f(h.prototype, {
            spin: function(b) {
                this.stop();
                var c = this, d = c.opts, f = c.el = a(null, {
                    className: d.className
                });
                if (e(f, {
                    position: d.position,
                    width: 0,
                    zIndex: d.zIndex,
                    left: d.left,
                    top: d.top
                }), b && b.insertBefore(f, b.firstChild || null), f.setAttribute("role", "progressbar"),
                c.lines(f, c.opts), !j) {
                    var g, h = 0, i = (d.lines - 1) * (1 - d.direction) / 2, k = d.fps, l = k / d.speed, m = (1 - d.opacity) / (l * d.trail / 100), n = l / d.lines;
                    !function o() {
                        h++;
                        for (var a = 0; a < d.lines; a++) g = Math.max(1 - (h + (d.lines - a) * n) % l * m, d.opacity),
                        c.opacity(f, a * d.direction + i, g, d);
                        c.timeout = c.el && setTimeout(o, ~~(1e3 / k));
                    }();
                }
                return c;
            },
            stop: function() {
                var a = this.el;
                return a && (clearTimeout(this.timeout), a.parentNode && a.parentNode.removeChild(a),
                this.el = void 0), this;
            },
            lines: function(d, f) {
                function h(b, c) {
                    return e(a(), {
                        position: "absolute",
                        width: f.scale * (f.length + f.width) + "px",
                        height: f.scale * f.width + "px",
                        background: b,
                        boxShadow: c,
                        transformOrigin: "left",
                        transform: "rotate(" + ~~(360 / f.lines * k + f.rotate) + "deg) translate(" + f.scale * f.radius + "px,0)",
                        borderRadius: (f.corners * f.scale * f.width >> 1) + "px"
                    });
                }
                for (var i, k = 0, l = (f.lines - 1) * (1 - f.direction) / 2; k < f.lines; k++) i = e(a(), {
                    position: "absolute",
                    top: 1 + ~(f.scale * f.width / 2) + "px",
                    transform: f.hwaccel ? "translate3d(0,0,0)" : "",
                    opacity: f.opacity,
                    animation: j && c(f.opacity, f.trail, l + k * f.direction, f.lines) + " " + 1 / f.speed + "s linear infinite"
                }), f.shadow && b(i, e(h("#000", "0 0 4px #000"), {
                    top: "2px"
                })), b(d, b(i, h(g(f.color, k), "0 0 1px rgba(0,0,0,.1)")));
                return d;
            },
            opacity: function(a, b, c) {
                b < a.childNodes.length && (a.childNodes[b].style.opacity = c);
            }
        }), "undefined" != typeof document) {
            k = function() {
                var c = a("style", {
                    type: "text/css"
                });
                return b(document.getElementsByTagName("head")[0], c), c.sheet || c.styleSheet;
            }();
            var o = e(a("group"), {
                behavior: "url(#default#VML)"
            });
            !d(o, "transform") && o.adj ? i() : j = d(o, "animation");
        }
        return h;
    });
    var ServiceParameterType = {
        String: 0,
        DateTime: 1,
        Bool: 2,
        Int: 3,
        Float: 4
    }, ticksOffsetFromUnixEpoch = 621355968e9, ticksInMillisecond = 1e4, millisecondsInMinute = 6e4;
    !function() {
        function extend(proto, prop, value) {
            proto[prop] || Object.defineProperty(proto, prop, {
                value: value,
                writable: !0,
                configurable: !0,
                enumerable: !1
            });
        }
        extend(Boolean, "parse", function(x) {
            switch (typeof x) {
              case "boolean":
                return x;

              case "string":
                switch (x.toLowerCase()) {
                  case "true":
                    return !0;

                  case "false":
                    return !1;

                  default:
                    var n = parseFloat(x);
                    return !isNaN(n) && 0 !== n;
                }

              default:
                return !1;
            }
        }), extend(String.prototype, "trim", function() {
            return this.replace(/^\s+|\s+$/g, "");
        }), extend(String.prototype, "format", function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, number) {
                return "undefined" != typeof args[number] ? args[number] : match;
            });
        }), extend(String.prototype, "startsWith", function(str) {
            return 0 === this.indexOf(str, 0);
        }), extend(String.prototype, "endsWith", function(str) {
            return -1 !== this.indexOf(str, this.length - str.length);
        }), extend(String.prototype, "right", function(nn) {
            return this.length > nn ? this.substr(this.length - nn) : this;
        }), extend(Date, "isDate", function(date) {
            return date instanceof Date && !isNaN(date.valueOf());
        }), extend(Date, "format", function(x, format) {
            var $c = {
                dayNames: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
                abbreviatedDayNames: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
                shortestDayNames: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ],
                firstLetterDayNames: [ "S", "M", "T", "W", "T", "F", "S" ],
                monthNames: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
                abbreviatedMonthNames: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
                amDesignator: "AM",
                pmDesignator: "PM"
            }, ord = function(n) {
                switch (1 * n) {
                  case 1:
                  case 21:
                  case 31:
                    return "st";

                  case 2:
                  case 22:
                    return "nd";

                  case 3:
                  case 23:
                    return "rd";

                  default:
                    return "th";
                }
            }, p = function(s, l) {
                return l || (l = 2), ("000" + s).slice(-1 * l);
            };
            return format ? format.replace(/(\\)?(dd?d?d?|MM?M?M?|yy?y?y?|hh?|HH?|mm?|ss?|tt?|S)/g, function(m) {
                if ("\\" === m.charAt(0)) return m.replace("\\", "");
                switch (m) {
                  case "hh":
                    return p(x.getHours() < 13 ? 0 === x.getHours() ? 12 : x.getHours() : x.getHours() - 12);

                  case "h":
                    return x.getHours() < 13 ? 0 === x.getHours() ? 12 : x.getHours() : x.getHours() - 12;

                  case "HH":
                    return p(x.getHours());

                  case "H":
                    return x.getHours();

                  case "mm":
                    return p(x.getMinutes());

                  case "m":
                    return x.getMinutes();

                  case "ss":
                    return p(x.getSeconds());

                  case "s":
                    return x.getSeconds();

                  case "yyyy":
                    return p(x.getFullYear(), 4);

                  case "yy":
                    return p(x.getFullYear());

                  case "dddd":
                    return $c.dayNames[x.getDay()];

                  case "ddd":
                    return $c.abbreviatedDayNames[x.getDay()];

                  case "dd":
                    return p(x.getDate());

                  case "d":
                    return x.getDate();

                  case "MMMM":
                    return $c.monthNames[x.getMonth()];

                  case "MMM":
                    return $c.abbreviatedMonthNames[x.getMonth()];

                  case "MM":
                    return p(x.getMonth() + 1);

                  case "M":
                    return x.getMonth() + 1;

                  case "t":
                    return x.getHours() < 12 ? $c.amDesignator.substring(0, 1) : $c.pmDesignator.substring(0, 1);

                  case "tt":
                    return x.getHours() < 12 ? $c.amDesignator : $c.pmDesignator;

                  case "S":
                    return ord(x.getDate());

                  default:
                    return m;
                }
            }) : x.toString();
        }), extend(Array.prototype, "clone", function() {
            return this.slice(0);
        }), extend(Array.prototype, "remove", function() {
            for (var what, ax, a = arguments, l = a.length; l && this.length; ) for (what = a[--l]; -1 !== (ax = this.indexOf(what)); ) this.splice(ax, 1);
            return this;
        });
    }();
    var DocumentState = {
        init: "init",
        progress: "progress",
        completed: "completed",
        error: "error"
    };
    Enum.prototype = {
        contains: function(item) {
            var self = this;
            return Object.keys(self).map(function(propertyName) {
                return self[propertyName];
            }).some(function(propertyValue) {
                return propertyValue === item;
            });
        },
        notContains: function(item) {
            return !this.contains(item);
        }
    };
    var ParameterType = new Enum();
    ParameterType.String = "string", ParameterType.DateTime = "datetime", ParameterType.Bool = "bool",
    ParameterType.Int = "int", ParameterType.Float = "float";
    var ParameterState = new Enum();
    ParameterState.Ok = "Ok", ParameterState.ExpectValue = "ExpectValue", ParameterState.HasOutstandingDependencies = "HasOutstandingDependencies",
    ParameterState.ValidationFailed = "ValidationFailed", ParameterState.DynamicValuesUnavailable = "DynamicValuesUnavailable",
    ParameterState.ClientValidationFailed = "ClientValidationFailed";
    var ParameterEditorType = new Enum();
    ParameterEditorType.SelectOneFromMany = "SelectOneFromMany", ParameterEditorType.MultiValue = "MultiValue",
    ParameterEditorType.MultiLine = "MultiLine", ParameterEditorType.SingleValue = "SingleValue";
    var ParameterSpecialValue = new Enum();
    ParameterSpecialValue.SelectAll = {
        toString: function() {
            return "(SELECT ALL)";
        }
    };
    var ExportType = new Enum();
    ExportType.Pdf = "Pdf", ExportType.Word = "Word", ExportType.Image = "Image", ExportType.Html = "Html",
    ExportType.Xls = "Xls";
    var ActionType = new Enum();
    ActionType.hyperlink = 0, ActionType.bookmark = 1, ActionType.drillthrough = 2,
    ActionType.toggle = 3;
    var SidebarState = new Enum();
    SidebarState.Hidden = "Hidden", SidebarState.Search = "Search", SidebarState.Parameters = "Parameters",
    SidebarState.TOC = "TOC", ko.bindingHandlers.activeTab = {
        init: function(element, valueAccessor) {
            function update() {
                var tab = value();
                $e.find(".tab-pane").removeClass("active"), $e.find("[data-tab-name=" + tab + "]").addClass("active");
            }
            var value = valueAccessor(), $e = $(element);
            update(), ko.isObservable(value) && value.subscribe(update);
        }
    }, ko.bindingHandlers.treeNode = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var options = valueAccessor(), $e = $(element);
            $e.find(".toggle").click(function() {
                if ($e.toggleClass("collapsed").toggleClass("expanded"), $e.hasClass("expanded") && !$e.hasClass("loaded")) {
                    $e.toggleClass("loaded");
                    var node = options.node;
                    "function" == typeof node.kids && node.kids();
                    var div = $("<div/>").appendTo($e);
                    ko.renderTemplate(options.template, bindingContext.createChildContext(node), {}, div[0]);
                }
                return !1;
            });
        }
    }, ko.bindingHandlers.spin = {
        init: function(element, valueAccessor) {
            function update() {
                visible() ? $(element).spin("load") : $(element).spin(!1);
            }
            var visible = valueAccessor();
            visible.subscribe(update), update();
        }
    }, ko.bindingHandlers.resizeViewerBody = {
        init: function(element) {
            function resize() {
                var tb1 = $e.find(".toolbar-top"), tb2 = $e.find(".toolbar-bottom"), h1 = tb1.length ? tb1.outerHeight(!0) : 0, h2 = tb2.length ? tb2.outerHeight(!0) : 0, height = $e.height() - h1 - h2;
                $e.find(".viewer-body").css("height", height + "px"), $e.find(".sidebar").css("height", height + "px");
            }
            function watchResize() {
                var state = [ $e.height(), $e.find(".toolbar-top").length, $e.find(".toolbar-bottom").length ];
                currentState.filter(function(v, i) {
                    return v != state[i];
                }).length && (currentState = state, resize());
            }
            var $e = $(element).parent(), currentState = [ $e.height(), $e.find(".toolbar-top").length, $e.find(".toolbar-bottom").length ];
            resize(), setInterval(watchResize, 10);
        }
    }, ko.bindingHandlers.scrollPosition = {
        init: function(element, valueAccessor) {
            var value = valueAccessor();
            value.subscribe(function() {
                var pos = value();
                $(element).scrollLeft(pos.left).scrollTop(pos.top);
            });
        }
    }, ko.bindingHandlers.showPanel = {
        init: function(element, valueAccessor, _, viewModel) {
            function update() {
                observable() ? $e.fadeIn().show() : $e.fadeOut().hide();
            }
            var observable = valueAccessor(), $e = $(element);
            update(), observable.subscribe(update), $e.on("click", "button.close", function() {
                observable(!1);
            });
        }
    }, ko.bindingHandlers.valueEdit = {
        init: function(element, valueAccessor) {
            function update() {
                $e.is(":focus") || $e.val(value());
            }
            var value = valueAccessor(), $e = $(element);
            value.subscribe(update), $e.focus(function() {
                var f = value.text;
                $e.val("function" == typeof f ? f.call(value) : ""), setTimeout(function() {
                    $e.select();
                }, 10);
            }).focusout(function() {
                $e.val(value());
            }).keydown(function(event) {
                var k = event.which ? event.which : event.keyCode;
                if (13 == k) {
                    event.preventDefault();
                    var oldVal = value();
                    return value($e.val()), oldVal != value() && $e.blur(), !1;
                }
                return !0;
            }), update();
        }
    }, ko.bindingHandlers.command = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var cmd = valueAccessor(), handlerAccessor = function() {
                return function() {
                    cmd.exec();
                };
            };
            ko.bindingHandlers.click.init(element, handlerAccessor, allBindings, viewModel, bindingContext);
        },
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var cmd = valueAccessor(), enabled = function() {
                return cmd.hasOwnProperty("enabled") ? cmd.enabled : !0;
            };
            ko.bindingHandlers.enable.update(element, enabled, allBindings, viewModel, bindingContext),
            ko.bindingHandlers.active.update(element, enabled, allBindings, viewModel, bindingContext);
        }
    }, ko.bindingHandlers.htmlPage = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            ko.bindingHandlers.html.init(element, function() {
                return valueAccessor().page;
            }, allBindings, viewModel, bindingContext);
        },
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var settings = valueAccessor();
            ko.bindingHandlers.html.update(element, function() {
                return settings.page;
            }, allBindings, viewModel, bindingContext), settings.onupdate && settings.onupdate.apply && settings.onupdate(element);
        }
    }, ko.bindingHandlers.bootstrapSwitch = {
        init: function(element, valueAccessor) {
            var value = valueAccessor(), switchEl = $(element);
            switchEl.bootstrapSwitch(), switchEl.bootstrapSwitch("setState", value()), switchEl.on("switch-change", function(e, data) {
                value(data.value);
            }), value.subscribe(function() {
                switchEl.bootstrapSwitch("setState", value());
            });
        }
    }, ko.bindingHandlers.allowBindings = {
        init: function(elem, valueAccessor) {
            var shouldAllowBindings = ko.utils.unwrapObservable(valueAccessor());
            return {
                controlsDescendantBindings: !shouldAllowBindings
            };
        }
    }, ko.bindingHandlers.dropdownForm = {
        init: function(elem, valueAccessor) {
            var formOptions = ko.utils.unwrapObservable(valueAccessor());
            formOptions.onApply && $(elem).on("hidden.bs.dropdown", function() {
                formOptions.onApply(!0);
            }), formOptions.onShown && $(elem).on("shown.bs.dropdown", formOptions.onShown),
            $(elem).on("click", ".dropdown-menu", function(e) {
                $(this).hasClass("dropdown-menu-form") && e.stopPropagation();
            });
        }
    }, ko.bindingHandlers.showEditor = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            function closeEditor(ok) {
                ko.removeNode(editor), editorOptions.onClose && editorOptions.onClose.apply && editorOptions.onClose(ok || !1),
                editor.hide(), editor.html("");
            }
            var editorOptions = ko.utils.unwrapObservable(valueAccessor()), editor = $(editorOptions.placeholder);
            editor.hide(), editor.html("");
            var clickHandler = function() {
                editor.hide(), editorOptions.enable === !1 || editorOptions.enable && editorOptions.enable.apply && editorOptions.enable() === !1 || ko.renderTemplate(editorOptions.template, viewModel, {
                    afterRender: function() {
                        editor.show(), editor.find("*:input[type=text]:first").focus().select(), editor.find("button.close, .close-onclick").click(function() {
                            closeEditor(!0);
                        }), editorOptions.visible && editorOptions.visible.subscribe && editorOptions.visible.subscribe(function(visible) {
                            visible || closeEditor(!1);
                        });
                    }
                }, editor[0], "replaceChildren");
            };
            ko.bindingHandlers.click.init(element, function() {
                return clickHandler;
            }, allBindings, viewModel, bindingContext);
        }
    }, ko.bindingHandlers.active = {
        update: function(element, valueAccessor) {
            $(element).attr("disabled", !ko.unwrap(valueAccessor()));
        }
    }, ko.subscriptions = function() {
        var list = [];
        return list.dispose = function() {
            return list.forEach(function(s) {
                s.dispose();
            }), list.length = 0, list;
        }, list;
    }, ko.promise = function(promiseFn, target) {
        var value = ko.observable();
        return ko.dependentObservable(function() {
            promiseFn.call(target).done(value);
        }), value;
    }, ko.deferredArray = function(promiseFn) {
        var array = ko.observable(null);
        return ko.computed({
            read: function() {
                return null === array() && (array([]), promiseFn().done(function(value) {
                    array(value);
                })), array();
            },
            deferEvaluation: !0
        });
    }, ko.waitFor = function(value, predicate, callback) {
        function unsubscr() {
            subscr && (subscr.dispose(), subscr = null);
        }
        if (predicate(value())) return callback(value()), noop;
        var subscr = value.subscribe(function(newValue) {
            predicate(newValue) && (unsubscr(), callback(newValue));
        });
        return unsubscr;
    };
    var ReportModelState = {
        noReport: "noReport",
        open: "open",
        documentReady: "documentReady",
        error: "error",
        closed: "closed"
    }, ReportType = {
        unknown: 0,
        pageReport: 1,
        sectionReport: 2
    };
    !function(modules) {
        function __webpack_require__(moduleId) {
            if (installedModules[moduleId]) return installedModules[moduleId].exports;
            var module = installedModules[moduleId] = {
                exports: {},
                id: moduleId,
                loaded: !1
            };
            return modules[moduleId].call(module.exports, module, module.exports, __webpack_require__),
            module.loaded = !0, module.exports;
        }
        var installedModules = {};
        return __webpack_require__.m = modules, __webpack_require__.c = installedModules,
        __webpack_require__.p = "", __webpack_require__(0);
    }([ function(module, exports, __webpack_require__) {
        module.exports = __webpack_require__(14);
    }, function(module, exports, __webpack_require__) {
        (function(Buffer, global) {
            /*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
            "use strict";
            function typedArraySupport() {
                function Bar() {}
                try {
                    var arr = new Uint8Array(1);
                    return arr.foo = function() {
                        return 42;
                    }, arr.constructor = Bar, 42 === arr.foo() && arr.constructor === Bar && "function" == typeof arr.subarray && 0 === arr.subarray(1, 1).byteLength;
                } catch (e) {
                    return !1;
                }
            }
            function kMaxLength() {
                return Buffer.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823;
            }
            function Buffer(arg) {
                return this instanceof Buffer ? (Buffer.TYPED_ARRAY_SUPPORT || (this.length = 0,
                this.parent = void 0), "number" == typeof arg ? fromNumber(this, arg) : "string" == typeof arg ? fromString(this, arg, arguments.length > 1 ? arguments[1] : "utf8") : fromObject(this, arg)) : arguments.length > 1 ? new Buffer(arg, arguments[1]) : new Buffer(arg);
            }
            function fromNumber(that, length) {
                if (that = allocate(that, 0 > length ? 0 : 0 | checked(length)), !Buffer.TYPED_ARRAY_SUPPORT) for (var i = 0; length > i; i++) that[i] = 0;
                return that;
            }
            function fromString(that, string, encoding) {
                ("string" != typeof encoding || "" === encoding) && (encoding = "utf8");
                var length = 0 | byteLength(string, encoding);
                return that = allocate(that, length), that.write(string, encoding), that;
            }
            function fromObject(that, object) {
                if (Buffer.isBuffer(object)) return fromBuffer(that, object);
                if (isArray(object)) return fromArray(that, object);
                if (null == object) throw new TypeError("must start with number, buffer, array or string");
                if ("undefined" != typeof ArrayBuffer) {
                    if (object.buffer instanceof ArrayBuffer) return fromTypedArray(that, object);
                    if (object instanceof ArrayBuffer) return fromArrayBuffer(that, object);
                }
                return object.length ? fromArrayLike(that, object) : fromJsonObject(that, object);
            }
            function fromBuffer(that, buffer) {
                var length = 0 | checked(buffer.length);
                return that = allocate(that, length), buffer.copy(that, 0, 0, length), that;
            }
            function fromArray(that, array) {
                var length = 0 | checked(array.length);
                that = allocate(that, length);
                for (var i = 0; length > i; i += 1) that[i] = 255 & array[i];
                return that;
            }
            function fromTypedArray(that, array) {
                var length = 0 | checked(array.length);
                that = allocate(that, length);
                for (var i = 0; length > i; i += 1) that[i] = 255 & array[i];
                return that;
            }
            function fromArrayBuffer(that, array) {
                return Buffer.TYPED_ARRAY_SUPPORT ? (array.byteLength, that = Buffer._augment(new Uint8Array(array))) : that = fromTypedArray(that, new Uint8Array(array)),
                that;
            }
            function fromArrayLike(that, array) {
                var length = 0 | checked(array.length);
                that = allocate(that, length);
                for (var i = 0; length > i; i += 1) that[i] = 255 & array[i];
                return that;
            }
            function fromJsonObject(that, object) {
                var array, length = 0;
                "Buffer" === object.type && isArray(object.data) && (array = object.data, length = 0 | checked(array.length)),
                that = allocate(that, length);
                for (var i = 0; length > i; i += 1) that[i] = 255 & array[i];
                return that;
            }
            function allocate(that, length) {
                Buffer.TYPED_ARRAY_SUPPORT ? (that = Buffer._augment(new Uint8Array(length)), that.__proto__ = Buffer.prototype) : (that.length = length,
                that._isBuffer = !0);
                var fromPool = 0 !== length && length <= Buffer.poolSize >>> 1;
                return fromPool && (that.parent = rootParent), that;
            }
            function checked(length) {
                if (length >= kMaxLength()) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + kMaxLength().toString(16) + " bytes");
                return 0 | length;
            }
            function SlowBuffer(subject, encoding) {
                if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding);
                var buf = new Buffer(subject, encoding);
                return delete buf.parent, buf;
            }
            function byteLength(string, encoding) {
                "string" != typeof string && (string = "" + string);
                var len = string.length;
                if (0 === len) return 0;
                for (var loweredCase = !1; ;) switch (encoding) {
                  case "ascii":
                  case "binary":
                  case "raw":
                  case "raws":
                    return len;

                  case "utf8":
                  case "utf-8":
                    return utf8ToBytes(string).length;

                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return 2 * len;

                  case "hex":
                    return len >>> 1;

                  case "base64":
                    return base64ToBytes(string).length;

                  default:
                    if (loweredCase) return utf8ToBytes(string).length;
                    encoding = ("" + encoding).toLowerCase(), loweredCase = !0;
                }
            }
            function slowToString(encoding, start, end) {
                var loweredCase = !1;
                if (start = 0 | start, end = void 0 === end || end === 1 / 0 ? this.length : 0 | end,
                encoding || (encoding = "utf8"), 0 > start && (start = 0), end > this.length && (end = this.length),
                start >= end) return "";
                for (;;) switch (encoding) {
                  case "hex":
                    return hexSlice(this, start, end);

                  case "utf8":
                  case "utf-8":
                    return utf8Slice(this, start, end);

                  case "ascii":
                    return asciiSlice(this, start, end);

                  case "binary":
                    return binarySlice(this, start, end);

                  case "base64":
                    return base64Slice(this, start, end);

                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return utf16leSlice(this, start, end);

                  default:
                    if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
                    encoding = (encoding + "").toLowerCase(), loweredCase = !0;
                }
            }
            function hexWrite(buf, string, offset, length) {
                offset = Number(offset) || 0;
                var remaining = buf.length - offset;
                length ? (length = Number(length), length > remaining && (length = remaining)) : length = remaining;
                var strLen = string.length;
                if (strLen % 2 !== 0) throw new Error("Invalid hex string");
                length > strLen / 2 && (length = strLen / 2);
                for (var i = 0; length > i; i++) {
                    var parsed = parseInt(string.substr(2 * i, 2), 16);
                    if (isNaN(parsed)) throw new Error("Invalid hex string");
                    buf[offset + i] = parsed;
                }
                return i;
            }
            function utf8Write(buf, string, offset, length) {
                return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
            }
            function asciiWrite(buf, string, offset, length) {
                return blitBuffer(asciiToBytes(string), buf, offset, length);
            }
            function binaryWrite(buf, string, offset, length) {
                return asciiWrite(buf, string, offset, length);
            }
            function base64Write(buf, string, offset, length) {
                return blitBuffer(base64ToBytes(string), buf, offset, length);
            }
            function ucs2Write(buf, string, offset, length) {
                return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
            }
            function base64Slice(buf, start, end) {
                return 0 === start && end === buf.length ? base64.fromByteArray(buf) : base64.fromByteArray(buf.slice(start, end));
            }
            function utf8Slice(buf, start, end) {
                end = Math.min(buf.length, end);
                for (var res = [], i = start; end > i; ) {
                    var firstByte = buf[i], codePoint = null, bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
                    if (end >= i + bytesPerSequence) {
                        var secondByte, thirdByte, fourthByte, tempCodePoint;
                        switch (bytesPerSequence) {
                          case 1:
                            128 > firstByte && (codePoint = firstByte);
                            break;

                          case 2:
                            secondByte = buf[i + 1], 128 === (192 & secondByte) && (tempCodePoint = (31 & firstByte) << 6 | 63 & secondByte,
                            tempCodePoint > 127 && (codePoint = tempCodePoint));
                            break;

                          case 3:
                            secondByte = buf[i + 1], thirdByte = buf[i + 2], 128 === (192 & secondByte) && 128 === (192 & thirdByte) && (tempCodePoint = (15 & firstByte) << 12 | (63 & secondByte) << 6 | 63 & thirdByte,
                            tempCodePoint > 2047 && (55296 > tempCodePoint || tempCodePoint > 57343) && (codePoint = tempCodePoint));
                            break;

                          case 4:
                            secondByte = buf[i + 1], thirdByte = buf[i + 2], fourthByte = buf[i + 3], 128 === (192 & secondByte) && 128 === (192 & thirdByte) && 128 === (192 & fourthByte) && (tempCodePoint = (15 & firstByte) << 18 | (63 & secondByte) << 12 | (63 & thirdByte) << 6 | 63 & fourthByte,
                            tempCodePoint > 65535 && 1114112 > tempCodePoint && (codePoint = tempCodePoint));
                        }
                    }
                    null === codePoint ? (codePoint = 65533, bytesPerSequence = 1) : codePoint > 65535 && (codePoint -= 65536,
                    res.push(codePoint >>> 10 & 1023 | 55296), codePoint = 56320 | 1023 & codePoint),
                    res.push(codePoint), i += bytesPerSequence;
                }
                return decodeCodePointsArray(res);
            }
            function decodeCodePointsArray(codePoints) {
                var len = codePoints.length;
                if (MAX_ARGUMENTS_LENGTH >= len) return String.fromCharCode.apply(String, codePoints);
                for (var res = "", i = 0; len > i; ) res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
                return res;
            }
            function asciiSlice(buf, start, end) {
                var ret = "";
                end = Math.min(buf.length, end);
                for (var i = start; end > i; i++) ret += String.fromCharCode(127 & buf[i]);
                return ret;
            }
            function binarySlice(buf, start, end) {
                var ret = "";
                end = Math.min(buf.length, end);
                for (var i = start; end > i; i++) ret += String.fromCharCode(buf[i]);
                return ret;
            }
            function hexSlice(buf, start, end) {
                var len = buf.length;
                (!start || 0 > start) && (start = 0), (!end || 0 > end || end > len) && (end = len);
                for (var out = "", i = start; end > i; i++) out += toHex(buf[i]);
                return out;
            }
            function utf16leSlice(buf, start, end) {
                for (var bytes = buf.slice(start, end), res = "", i = 0; i < bytes.length; i += 2) res += String.fromCharCode(bytes[i] + 256 * bytes[i + 1]);
                return res;
            }
            function checkOffset(offset, ext, length) {
                if (offset % 1 !== 0 || 0 > offset) throw new RangeError("offset is not uint");
                if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
            }
            function checkInt(buf, value, offset, ext, max, min) {
                if (!Buffer.isBuffer(buf)) throw new TypeError("buffer must be a Buffer instance");
                if (value > max || min > value) throw new RangeError("value is out of bounds");
                if (offset + ext > buf.length) throw new RangeError("index out of range");
            }
            function objectWriteUInt16(buf, value, offset, littleEndian) {
                0 > value && (value = 65535 + value + 1);
                for (var i = 0, j = Math.min(buf.length - offset, 2); j > i; i++) buf[offset + i] = (value & 255 << 8 * (littleEndian ? i : 1 - i)) >>> 8 * (littleEndian ? i : 1 - i);
            }
            function objectWriteUInt32(buf, value, offset, littleEndian) {
                0 > value && (value = 4294967295 + value + 1);
                for (var i = 0, j = Math.min(buf.length - offset, 4); j > i; i++) buf[offset + i] = value >>> 8 * (littleEndian ? i : 3 - i) & 255;
            }
            function checkIEEE754(buf, value, offset, ext, max, min) {
                if (value > max || min > value) throw new RangeError("value is out of bounds");
                if (offset + ext > buf.length) throw new RangeError("index out of range");
                if (0 > offset) throw new RangeError("index out of range");
            }
            function writeFloat(buf, value, offset, littleEndian, noAssert) {
                return noAssert || checkIEEE754(buf, value, offset, 4, 3.4028234663852886e38, -3.4028234663852886e38),
                ieee754.write(buf, value, offset, littleEndian, 23, 4), offset + 4;
            }
            function writeDouble(buf, value, offset, littleEndian, noAssert) {
                return noAssert || checkIEEE754(buf, value, offset, 8, 1.7976931348623157e308, -1.7976931348623157e308),
                ieee754.write(buf, value, offset, littleEndian, 52, 8), offset + 8;
            }
            function base64clean(str) {
                if (str = stringtrim(str).replace(INVALID_BASE64_RE, ""), str.length < 2) return "";
                for (;str.length % 4 !== 0; ) str += "=";
                return str;
            }
            function stringtrim(str) {
                return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
            }
            function toHex(n) {
                return 16 > n ? "0" + n.toString(16) : n.toString(16);
            }
            function utf8ToBytes(string, units) {
                units = units || 1 / 0;
                for (var codePoint, length = string.length, leadSurrogate = null, bytes = [], i = 0; length > i; i++) {
                    if (codePoint = string.charCodeAt(i), codePoint > 55295 && 57344 > codePoint) {
                        if (!leadSurrogate) {
                            if (codePoint > 56319) {
                                (units -= 3) > -1 && bytes.push(239, 191, 189);
                                continue;
                            }
                            if (i + 1 === length) {
                                (units -= 3) > -1 && bytes.push(239, 191, 189);
                                continue;
                            }
                            leadSurrogate = codePoint;
                            continue;
                        }
                        if (56320 > codePoint) {
                            (units -= 3) > -1 && bytes.push(239, 191, 189), leadSurrogate = codePoint;
                            continue;
                        }
                        codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
                    } else leadSurrogate && (units -= 3) > -1 && bytes.push(239, 191, 189);
                    if (leadSurrogate = null, 128 > codePoint) {
                        if ((units -= 1) < 0) break;
                        bytes.push(codePoint);
                    } else if (2048 > codePoint) {
                        if ((units -= 2) < 0) break;
                        bytes.push(codePoint >> 6 | 192, 63 & codePoint | 128);
                    } else if (65536 > codePoint) {
                        if ((units -= 3) < 0) break;
                        bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, 63 & codePoint | 128);
                    } else {
                        if (!(1114112 > codePoint)) throw new Error("Invalid code point");
                        if ((units -= 4) < 0) break;
                        bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, 63 & codePoint | 128);
                    }
                }
                return bytes;
            }
            function asciiToBytes(str) {
                for (var byteArray = [], i = 0; i < str.length; i++) byteArray.push(255 & str.charCodeAt(i));
                return byteArray;
            }
            function utf16leToBytes(str, units) {
                for (var c, hi, lo, byteArray = [], i = 0; i < str.length && !((units -= 2) < 0); i++) c = str.charCodeAt(i),
                hi = c >> 8, lo = c % 256, byteArray.push(lo), byteArray.push(hi);
                return byteArray;
            }
            function base64ToBytes(str) {
                return base64.toByteArray(base64clean(str));
            }
            function blitBuffer(src, dst, offset, length) {
                for (var i = 0; length > i && !(i + offset >= dst.length || i >= src.length); i++) dst[i + offset] = src[i];
                return i;
            }
            var base64 = __webpack_require__(16), ieee754 = __webpack_require__(19), isArray = __webpack_require__(17);
            exports.Buffer = Buffer, exports.SlowBuffer = SlowBuffer, exports.INSPECT_MAX_BYTES = 50,
            Buffer.poolSize = 8192;
            var rootParent = {};
            Buffer.TYPED_ARRAY_SUPPORT = void 0 !== global.TYPED_ARRAY_SUPPORT ? global.TYPED_ARRAY_SUPPORT : typedArraySupport(),
            Buffer.TYPED_ARRAY_SUPPORT ? (Buffer.prototype.__proto__ = Uint8Array.prototype,
            Buffer.__proto__ = Uint8Array) : (Buffer.prototype.length = void 0, Buffer.prototype.parent = void 0),
            Buffer.isBuffer = function(b) {
                return !(null == b || !b._isBuffer);
            }, Buffer.compare = function(a, b) {
                if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) throw new TypeError("Arguments must be Buffers");
                if (a === b) return 0;
                for (var x = a.length, y = b.length, i = 0, len = Math.min(x, y); len > i && a[i] === b[i]; ) ++i;
                return i !== len && (x = a[i], y = b[i]), y > x ? -1 : x > y ? 1 : 0;
            }, Buffer.isEncoding = function(encoding) {
                switch (String(encoding).toLowerCase()) {
                  case "hex":
                  case "utf8":
                  case "utf-8":
                  case "ascii":
                  case "binary":
                  case "base64":
                  case "raw":
                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return !0;

                  default:
                    return !1;
                }
            }, Buffer.concat = function(list, length) {
                if (!isArray(list)) throw new TypeError("list argument must be an Array of Buffers.");
                if (0 === list.length) return new Buffer(0);
                var i;
                if (void 0 === length) for (length = 0, i = 0; i < list.length; i++) length += list[i].length;
                var buf = new Buffer(length), pos = 0;
                for (i = 0; i < list.length; i++) {
                    var item = list[i];
                    item.copy(buf, pos), pos += item.length;
                }
                return buf;
            }, Buffer.byteLength = byteLength, Buffer.prototype.toString = function() {
                var length = 0 | this.length;
                return 0 === length ? "" : 0 === arguments.length ? utf8Slice(this, 0, length) : slowToString.apply(this, arguments);
            }, Buffer.prototype.equals = function(b) {
                if (!Buffer.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
                return this === b ? !0 : 0 === Buffer.compare(this, b);
            }, Buffer.prototype.inspect = function() {
                var str = "", max = exports.INSPECT_MAX_BYTES;
                return this.length > 0 && (str = this.toString("hex", 0, max).match(/.{2}/g).join(" "),
                this.length > max && (str += " ... ")), "<Buffer " + str + ">";
            }, Buffer.prototype.compare = function(b) {
                if (!Buffer.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
                return this === b ? 0 : Buffer.compare(this, b);
            }, Buffer.prototype.indexOf = function(val, byteOffset) {
                function arrayIndexOf(arr, val, byteOffset) {
                    for (var foundIndex = -1, i = 0; byteOffset + i < arr.length; i++) if (arr[byteOffset + i] === val[-1 === foundIndex ? 0 : i - foundIndex]) {
                        if (-1 === foundIndex && (foundIndex = i), i - foundIndex + 1 === val.length) return byteOffset + foundIndex;
                    } else foundIndex = -1;
                    return -1;
                }
                if (byteOffset > 2147483647 ? byteOffset = 2147483647 : -2147483648 > byteOffset && (byteOffset = -2147483648),
                byteOffset >>= 0, 0 === this.length) return -1;
                if (byteOffset >= this.length) return -1;
                if (0 > byteOffset && (byteOffset = Math.max(this.length + byteOffset, 0)), "string" == typeof val) return 0 === val.length ? -1 : String.prototype.indexOf.call(this, val, byteOffset);
                if (Buffer.isBuffer(val)) return arrayIndexOf(this, val, byteOffset);
                if ("number" == typeof val) return Buffer.TYPED_ARRAY_SUPPORT && "function" === Uint8Array.prototype.indexOf ? Uint8Array.prototype.indexOf.call(this, val, byteOffset) : arrayIndexOf(this, [ val ], byteOffset);
                throw new TypeError("val must be string, number or Buffer");
            }, Buffer.prototype.get = function(offset) {
                return console.log(".get() is deprecated. Access using array indexes instead."),
                this.readUInt8(offset);
            }, Buffer.prototype.set = function(v, offset) {
                return console.log(".set() is deprecated. Access using array indexes instead."),
                this.writeUInt8(v, offset);
            }, Buffer.prototype.write = function(string, offset, length, encoding) {
                if (void 0 === offset) encoding = "utf8", length = this.length, offset = 0; else if (void 0 === length && "string" == typeof offset) encoding = offset,
                length = this.length, offset = 0; else if (isFinite(offset)) offset = 0 | offset,
                isFinite(length) ? (length = 0 | length, void 0 === encoding && (encoding = "utf8")) : (encoding = length,
                length = void 0); else {
                    var swap = encoding;
                    encoding = offset, offset = 0 | length, length = swap;
                }
                var remaining = this.length - offset;
                if ((void 0 === length || length > remaining) && (length = remaining), string.length > 0 && (0 > length || 0 > offset) || offset > this.length) throw new RangeError("attempt to write outside buffer bounds");
                encoding || (encoding = "utf8");
                for (var loweredCase = !1; ;) switch (encoding) {
                  case "hex":
                    return hexWrite(this, string, offset, length);

                  case "utf8":
                  case "utf-8":
                    return utf8Write(this, string, offset, length);

                  case "ascii":
                    return asciiWrite(this, string, offset, length);

                  case "binary":
                    return binaryWrite(this, string, offset, length);

                  case "base64":
                    return base64Write(this, string, offset, length);

                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return ucs2Write(this, string, offset, length);

                  default:
                    if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
                    encoding = ("" + encoding).toLowerCase(), loweredCase = !0;
                }
            }, Buffer.prototype.toJSON = function() {
                return {
                    type: "Buffer",
                    data: Array.prototype.slice.call(this._arr || this, 0)
                };
            };
            var MAX_ARGUMENTS_LENGTH = 4096;
            Buffer.prototype.slice = function(start, end) {
                var len = this.length;
                start = ~~start, end = void 0 === end ? len : ~~end, 0 > start ? (start += len,
                0 > start && (start = 0)) : start > len && (start = len), 0 > end ? (end += len,
                0 > end && (end = 0)) : end > len && (end = len), start > end && (end = start);
                var newBuf;
                if (Buffer.TYPED_ARRAY_SUPPORT) newBuf = Buffer._augment(this.subarray(start, end)); else {
                    var sliceLen = end - start;
                    newBuf = new Buffer(sliceLen, void 0);
                    for (var i = 0; sliceLen > i; i++) newBuf[i] = this[i + start];
                }
                return newBuf.length && (newBuf.parent = this.parent || this), newBuf;
            }, Buffer.prototype.readUIntLE = function(offset, byteLength, noAssert) {
                offset = 0 | offset, byteLength = 0 | byteLength, noAssert || checkOffset(offset, byteLength, this.length);
                for (var val = this[offset], mul = 1, i = 0; ++i < byteLength && (mul *= 256); ) val += this[offset + i] * mul;
                return val;
            }, Buffer.prototype.readUIntBE = function(offset, byteLength, noAssert) {
                offset = 0 | offset, byteLength = 0 | byteLength, noAssert || checkOffset(offset, byteLength, this.length);
                for (var val = this[offset + --byteLength], mul = 1; byteLength > 0 && (mul *= 256); ) val += this[offset + --byteLength] * mul;
                return val;
            }, Buffer.prototype.readUInt8 = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 1, this.length), this[offset];
            }, Buffer.prototype.readUInt16LE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 2, this.length), this[offset] | this[offset + 1] << 8;
            }, Buffer.prototype.readUInt16BE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 2, this.length), this[offset] << 8 | this[offset + 1];
            }, Buffer.prototype.readUInt32LE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 4, this.length), (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + 16777216 * this[offset + 3];
            }, Buffer.prototype.readUInt32BE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 4, this.length), 16777216 * this[offset] + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
            }, Buffer.prototype.readIntLE = function(offset, byteLength, noAssert) {
                offset = 0 | offset, byteLength = 0 | byteLength, noAssert || checkOffset(offset, byteLength, this.length);
                for (var val = this[offset], mul = 1, i = 0; ++i < byteLength && (mul *= 256); ) val += this[offset + i] * mul;
                return mul *= 128, val >= mul && (val -= Math.pow(2, 8 * byteLength)), val;
            }, Buffer.prototype.readIntBE = function(offset, byteLength, noAssert) {
                offset = 0 | offset, byteLength = 0 | byteLength, noAssert || checkOffset(offset, byteLength, this.length);
                for (var i = byteLength, mul = 1, val = this[offset + --i]; i > 0 && (mul *= 256); ) val += this[offset + --i] * mul;
                return mul *= 128, val >= mul && (val -= Math.pow(2, 8 * byteLength)), val;
            }, Buffer.prototype.readInt8 = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 1, this.length), 128 & this[offset] ? -1 * (255 - this[offset] + 1) : this[offset];
            }, Buffer.prototype.readInt16LE = function(offset, noAssert) {
                noAssert || checkOffset(offset, 2, this.length);
                var val = this[offset] | this[offset + 1] << 8;
                return 32768 & val ? 4294901760 | val : val;
            }, Buffer.prototype.readInt16BE = function(offset, noAssert) {
                noAssert || checkOffset(offset, 2, this.length);
                var val = this[offset + 1] | this[offset] << 8;
                return 32768 & val ? 4294901760 | val : val;
            }, Buffer.prototype.readInt32LE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 4, this.length), this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
            }, Buffer.prototype.readInt32BE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 4, this.length), this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
            }, Buffer.prototype.readFloatLE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 4, this.length), ieee754.read(this, offset, !0, 23, 4);
            }, Buffer.prototype.readFloatBE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 4, this.length), ieee754.read(this, offset, !1, 23, 4);
            }, Buffer.prototype.readDoubleLE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 8, this.length), ieee754.read(this, offset, !0, 52, 8);
            }, Buffer.prototype.readDoubleBE = function(offset, noAssert) {
                return noAssert || checkOffset(offset, 8, this.length), ieee754.read(this, offset, !1, 52, 8);
            }, Buffer.prototype.writeUIntLE = function(value, offset, byteLength, noAssert) {
                value = +value, offset = 0 | offset, byteLength = 0 | byteLength, noAssert || checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
                var mul = 1, i = 0;
                for (this[offset] = 255 & value; ++i < byteLength && (mul *= 256); ) this[offset + i] = value / mul & 255;
                return offset + byteLength;
            }, Buffer.prototype.writeUIntBE = function(value, offset, byteLength, noAssert) {
                value = +value, offset = 0 | offset, byteLength = 0 | byteLength, noAssert || checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
                var i = byteLength - 1, mul = 1;
                for (this[offset + i] = 255 & value; --i >= 0 && (mul *= 256); ) this[offset + i] = value / mul & 255;
                return offset + byteLength;
            }, Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 1, 255, 0),
                Buffer.TYPED_ARRAY_SUPPORT || (value = Math.floor(value)), this[offset] = 255 & value,
                offset + 1;
            }, Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 2, 65535, 0),
                Buffer.TYPED_ARRAY_SUPPORT ? (this[offset] = 255 & value, this[offset + 1] = value >>> 8) : objectWriteUInt16(this, value, offset, !0),
                offset + 2;
            }, Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 2, 65535, 0),
                Buffer.TYPED_ARRAY_SUPPORT ? (this[offset] = value >>> 8, this[offset + 1] = 255 & value) : objectWriteUInt16(this, value, offset, !1),
                offset + 2;
            }, Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 4, 4294967295, 0),
                Buffer.TYPED_ARRAY_SUPPORT ? (this[offset + 3] = value >>> 24, this[offset + 2] = value >>> 16,
                this[offset + 1] = value >>> 8, this[offset] = 255 & value) : objectWriteUInt32(this, value, offset, !0),
                offset + 4;
            }, Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 4, 4294967295, 0),
                Buffer.TYPED_ARRAY_SUPPORT ? (this[offset] = value >>> 24, this[offset + 1] = value >>> 16,
                this[offset + 2] = value >>> 8, this[offset + 3] = 255 & value) : objectWriteUInt32(this, value, offset, !1),
                offset + 4;
            }, Buffer.prototype.writeIntLE = function(value, offset, byteLength, noAssert) {
                if (value = +value, offset = 0 | offset, !noAssert) {
                    var limit = Math.pow(2, 8 * byteLength - 1);
                    checkInt(this, value, offset, byteLength, limit - 1, -limit);
                }
                var i = 0, mul = 1, sub = 0 > value ? 1 : 0;
                for (this[offset] = 255 & value; ++i < byteLength && (mul *= 256); ) this[offset + i] = (value / mul >> 0) - sub & 255;
                return offset + byteLength;
            }, Buffer.prototype.writeIntBE = function(value, offset, byteLength, noAssert) {
                if (value = +value, offset = 0 | offset, !noAssert) {
                    var limit = Math.pow(2, 8 * byteLength - 1);
                    checkInt(this, value, offset, byteLength, limit - 1, -limit);
                }
                var i = byteLength - 1, mul = 1, sub = 0 > value ? 1 : 0;
                for (this[offset + i] = 255 & value; --i >= 0 && (mul *= 256); ) this[offset + i] = (value / mul >> 0) - sub & 255;
                return offset + byteLength;
            }, Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 1, 127, -128),
                Buffer.TYPED_ARRAY_SUPPORT || (value = Math.floor(value)), 0 > value && (value = 255 + value + 1),
                this[offset] = 255 & value, offset + 1;
            }, Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 2, 32767, -32768),
                Buffer.TYPED_ARRAY_SUPPORT ? (this[offset] = 255 & value, this[offset + 1] = value >>> 8) : objectWriteUInt16(this, value, offset, !0),
                offset + 2;
            }, Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 2, 32767, -32768),
                Buffer.TYPED_ARRAY_SUPPORT ? (this[offset] = value >>> 8, this[offset + 1] = 255 & value) : objectWriteUInt16(this, value, offset, !1),
                offset + 2;
            }, Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 4, 2147483647, -2147483648),
                Buffer.TYPED_ARRAY_SUPPORT ? (this[offset] = 255 & value, this[offset + 1] = value >>> 8,
                this[offset + 2] = value >>> 16, this[offset + 3] = value >>> 24) : objectWriteUInt32(this, value, offset, !0),
                offset + 4;
            }, Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
                return value = +value, offset = 0 | offset, noAssert || checkInt(this, value, offset, 4, 2147483647, -2147483648),
                0 > value && (value = 4294967295 + value + 1), Buffer.TYPED_ARRAY_SUPPORT ? (this[offset] = value >>> 24,
                this[offset + 1] = value >>> 16, this[offset + 2] = value >>> 8, this[offset + 3] = 255 & value) : objectWriteUInt32(this, value, offset, !1),
                offset + 4;
            }, Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
                return writeFloat(this, value, offset, !0, noAssert);
            }, Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
                return writeFloat(this, value, offset, !1, noAssert);
            }, Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
                return writeDouble(this, value, offset, !0, noAssert);
            }, Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
                return writeDouble(this, value, offset, !1, noAssert);
            }, Buffer.prototype.copy = function(target, targetStart, start, end) {
                if (start || (start = 0), end || 0 === end || (end = this.length), targetStart >= target.length && (targetStart = target.length),
                targetStart || (targetStart = 0), end > 0 && start > end && (end = start), end === start) return 0;
                if (0 === target.length || 0 === this.length) return 0;
                if (0 > targetStart) throw new RangeError("targetStart out of bounds");
                if (0 > start || start >= this.length) throw new RangeError("sourceStart out of bounds");
                if (0 > end) throw new RangeError("sourceEnd out of bounds");
                end > this.length && (end = this.length), target.length - targetStart < end - start && (end = target.length - targetStart + start);
                var i, len = end - start;
                if (this === target && targetStart > start && end > targetStart) for (i = len - 1; i >= 0; i--) target[i + targetStart] = this[i + start]; else if (1e3 > len || !Buffer.TYPED_ARRAY_SUPPORT) for (i = 0; len > i; i++) target[i + targetStart] = this[i + start]; else target._set(this.subarray(start, start + len), targetStart);
                return len;
            }, Buffer.prototype.fill = function(value, start, end) {
                if (value || (value = 0), start || (start = 0), end || (end = this.length), start > end) throw new RangeError("end < start");
                if (end !== start && 0 !== this.length) {
                    if (0 > start || start >= this.length) throw new RangeError("start out of bounds");
                    if (0 > end || end > this.length) throw new RangeError("end out of bounds");
                    var i;
                    if ("number" == typeof value) for (i = start; end > i; i++) this[i] = value; else {
                        var bytes = utf8ToBytes(value.toString()), len = bytes.length;
                        for (i = start; end > i; i++) this[i] = bytes[i % len];
                    }
                    return this;
                }
            }, Buffer.prototype.toArrayBuffer = function() {
                if ("undefined" != typeof Uint8Array) {
                    if (Buffer.TYPED_ARRAY_SUPPORT) return new Buffer(this).buffer;
                    for (var buf = new Uint8Array(this.length), i = 0, len = buf.length; len > i; i += 1) buf[i] = this[i];
                    return buf.buffer;
                }
                throw new TypeError("Buffer.toArrayBuffer not supported in this browser");
            };
            var BP = Buffer.prototype;
            Buffer._augment = function(arr) {
                return arr.constructor = Buffer, arr._isBuffer = !0, arr._set = arr.set, arr.get = BP.get,
                arr.set = BP.set, arr.write = BP.write, arr.toString = BP.toString, arr.toLocaleString = BP.toString,
                arr.toJSON = BP.toJSON, arr.equals = BP.equals, arr.compare = BP.compare, arr.indexOf = BP.indexOf,
                arr.copy = BP.copy, arr.slice = BP.slice, arr.readUIntLE = BP.readUIntLE, arr.readUIntBE = BP.readUIntBE,
                arr.readUInt8 = BP.readUInt8, arr.readUInt16LE = BP.readUInt16LE, arr.readUInt16BE = BP.readUInt16BE,
                arr.readUInt32LE = BP.readUInt32LE, arr.readUInt32BE = BP.readUInt32BE, arr.readIntLE = BP.readIntLE,
                arr.readIntBE = BP.readIntBE, arr.readInt8 = BP.readInt8, arr.readInt16LE = BP.readInt16LE,
                arr.readInt16BE = BP.readInt16BE, arr.readInt32LE = BP.readInt32LE, arr.readInt32BE = BP.readInt32BE,
                arr.readFloatLE = BP.readFloatLE, arr.readFloatBE = BP.readFloatBE, arr.readDoubleLE = BP.readDoubleLE,
                arr.readDoubleBE = BP.readDoubleBE, arr.writeUInt8 = BP.writeUInt8, arr.writeUIntLE = BP.writeUIntLE,
                arr.writeUIntBE = BP.writeUIntBE, arr.writeUInt16LE = BP.writeUInt16LE, arr.writeUInt16BE = BP.writeUInt16BE,
                arr.writeUInt32LE = BP.writeUInt32LE, arr.writeUInt32BE = BP.writeUInt32BE, arr.writeIntLE = BP.writeIntLE,
                arr.writeIntBE = BP.writeIntBE, arr.writeInt8 = BP.writeInt8, arr.writeInt16LE = BP.writeInt16LE,
                arr.writeInt16BE = BP.writeInt16BE, arr.writeInt32LE = BP.writeInt32LE, arr.writeInt32BE = BP.writeInt32BE,
                arr.writeFloatLE = BP.writeFloatLE, arr.writeFloatBE = BP.writeFloatBE, arr.writeDoubleLE = BP.writeDoubleLE,
                arr.writeDoubleBE = BP.writeDoubleBE, arr.fill = BP.fill, arr.inspect = BP.inspect,
                arr.toArrayBuffer = BP.toArrayBuffer, arr;
            };
            var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;
        }).call(exports, __webpack_require__(1).Buffer, function() {
            return this;
        }());
    }, function(module, exports) {
        "function" == typeof Object.create ? module.exports = function(ctor, superCtor) {
            ctor.super_ = superCtor, ctor.prototype = Object.create(superCtor.prototype, {
                constructor: {
                    value: ctor,
                    enumerable: !1,
                    writable: !0,
                    configurable: !0
                }
            });
        } : module.exports = function(ctor, superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function() {};
            TempCtor.prototype = superCtor.prototype, ctor.prototype = new TempCtor(), ctor.prototype.constructor = ctor;
        };
    }, function(module, exports, __webpack_require__) {
        (function(process) {
            function Duplex(options) {
                return this instanceof Duplex ? (Readable.call(this, options), Writable.call(this, options),
                options && options.readable === !1 && (this.readable = !1), options && options.writable === !1 && (this.writable = !1),
                this.allowHalfOpen = !0, options && options.allowHalfOpen === !1 && (this.allowHalfOpen = !1),
                void this.once("end", onend)) : new Duplex(options);
            }
            function onend() {
                this.allowHalfOpen || this._writableState.ended || process.nextTick(this.end.bind(this));
            }
            function forEach(xs, f) {
                for (var i = 0, l = xs.length; l > i; i++) f(xs[i], i);
            }
            module.exports = Duplex;
            var objectKeys = Object.keys || function(obj) {
                var keys = [];
                for (var key in obj) keys.push(key);
                return keys;
            }, util = __webpack_require__(4);
            util.inherits = __webpack_require__(2);
            var Readable = __webpack_require__(11), Writable = __webpack_require__(8);
            util.inherits(Duplex, Readable), forEach(objectKeys(Writable.prototype), function(method) {
                Duplex.prototype[method] || (Duplex.prototype[method] = Writable.prototype[method]);
            });
        }).call(exports, __webpack_require__(5));
    }, function(module, exports, __webpack_require__) {
        (function(Buffer) {
            function isArray(arg) {
                return Array.isArray ? Array.isArray(arg) : "[object Array]" === objectToString(arg);
            }
            function isBoolean(arg) {
                return "boolean" == typeof arg;
            }
            function isNull(arg) {
                return null === arg;
            }
            function isNullOrUndefined(arg) {
                return null == arg;
            }
            function isNumber(arg) {
                return "number" == typeof arg;
            }
            function isString(arg) {
                return "string" == typeof arg;
            }
            function isSymbol(arg) {
                return "symbol" == typeof arg;
            }
            function isUndefined(arg) {
                return void 0 === arg;
            }
            function isRegExp(re) {
                return "[object RegExp]" === objectToString(re);
            }
            function isObject(arg) {
                return "object" == typeof arg && null !== arg;
            }
            function isDate(d) {
                return "[object Date]" === objectToString(d);
            }
            function isError(e) {
                return "[object Error]" === objectToString(e) || e instanceof Error;
            }
            function isFunction(arg) {
                return "function" == typeof arg;
            }
            function isPrimitive(arg) {
                return null === arg || "boolean" == typeof arg || "number" == typeof arg || "string" == typeof arg || "symbol" == typeof arg || "undefined" == typeof arg;
            }
            function objectToString(o) {
                return Object.prototype.toString.call(o);
            }
            exports.isArray = isArray, exports.isBoolean = isBoolean, exports.isNull = isNull,
            exports.isNullOrUndefined = isNullOrUndefined, exports.isNumber = isNumber, exports.isString = isString,
            exports.isSymbol = isSymbol, exports.isUndefined = isUndefined, exports.isRegExp = isRegExp,
            exports.isObject = isObject, exports.isDate = isDate, exports.isError = isError,
            exports.isFunction = isFunction, exports.isPrimitive = isPrimitive, exports.isBuffer = Buffer.isBuffer;
        }).call(exports, __webpack_require__(1).Buffer);
    }, function(module, exports) {
        function cleanUpNextTick() {
            draining = !1, currentQueue.length ? queue = currentQueue.concat(queue) : queueIndex = -1,
            queue.length && drainQueue();
        }
        function drainQueue() {
            if (!draining) {
                var timeout = setTimeout(cleanUpNextTick);
                draining = !0;
                for (var len = queue.length; len; ) {
                    for (currentQueue = queue, queue = []; ++queueIndex < len; ) currentQueue && currentQueue[queueIndex].run();
                    queueIndex = -1, len = queue.length;
                }
                currentQueue = null, draining = !1, clearTimeout(timeout);
            }
        }
        function Item(fun, array) {
            this.fun = fun, this.array = array;
        }
        function noop() {}
        var currentQueue, process = module.exports = {}, queue = [], draining = !1, queueIndex = -1;
        process.nextTick = function(fun) {
            var args = new Array(arguments.length - 1);
            if (arguments.length > 1) for (var i = 1; i < arguments.length; i++) args[i - 1] = arguments[i];
            queue.push(new Item(fun, args)), 1 !== queue.length || draining || setTimeout(drainQueue, 0);
        }, Item.prototype.run = function() {
            this.fun.apply(null, this.array);
        }, process.title = "browser", process.browser = !0, process.env = {}, process.argv = [],
        process.version = "", process.versions = {}, process.on = noop, process.addListener = noop,
        process.once = noop, process.off = noop, process.removeListener = noop, process.removeAllListeners = noop,
        process.emit = noop, process.binding = function(name) {
            throw new Error("process.binding is not supported");
        }, process.cwd = function() {
            return "/";
        }, process.chdir = function(dir) {
            throw new Error("process.chdir is not supported");
        }, process.umask = function() {
            return 0;
        };
    }, function(module, exports, __webpack_require__) {
        function Stream() {
            EE.call(this);
        }
        module.exports = Stream;
        var EE = __webpack_require__(9).EventEmitter, inherits = __webpack_require__(2);
        inherits(Stream, EE), Stream.Readable = __webpack_require__(26), Stream.Writable = __webpack_require__(28),
        Stream.Duplex = __webpack_require__(24), Stream.Transform = __webpack_require__(27),
        Stream.PassThrough = __webpack_require__(25), Stream.Stream = Stream, Stream.prototype.pipe = function(dest, options) {
            function ondata(chunk) {
                dest.writable && !1 === dest.write(chunk) && source.pause && source.pause();
            }
            function ondrain() {
                source.readable && source.resume && source.resume();
            }
            function onend() {
                didOnEnd || (didOnEnd = !0, dest.end());
            }
            function onclose() {
                didOnEnd || (didOnEnd = !0, "function" == typeof dest.destroy && dest.destroy());
            }
            function onerror(er) {
                if (cleanup(), 0 === EE.listenerCount(this, "error")) throw er;
            }
            function cleanup() {
                source.removeListener("data", ondata), dest.removeListener("drain", ondrain), source.removeListener("end", onend),
                source.removeListener("close", onclose), source.removeListener("error", onerror),
                dest.removeListener("error", onerror), source.removeListener("end", cleanup), source.removeListener("close", cleanup),
                dest.removeListener("close", cleanup);
            }
            var source = this;
            source.on("data", ondata), dest.on("drain", ondrain), dest._isStdio || options && options.end === !1 || (source.on("end", onend),
            source.on("close", onclose));
            var didOnEnd = !1;
            return source.on("error", onerror), dest.on("error", onerror), source.on("end", cleanup),
            source.on("close", cleanup), dest.on("close", cleanup), dest.emit("pipe", source),
            dest;
        };
    }, function(module, exports, __webpack_require__) {
        function TransformState(options, stream) {
            this.afterTransform = function(er, data) {
                return afterTransform(stream, er, data);
            }, this.needTransform = !1, this.transforming = !1, this.writecb = null, this.writechunk = null;
        }
        function afterTransform(stream, er, data) {
            var ts = stream._transformState;
            ts.transforming = !1;
            var cb = ts.writecb;
            if (!cb) return stream.emit("error", new Error("no writecb in Transform class"));
            ts.writechunk = null, ts.writecb = null, util.isNullOrUndefined(data) || stream.push(data),
            cb && cb(er);
            var rs = stream._readableState;
            rs.reading = !1, (rs.needReadable || rs.length < rs.highWaterMark) && stream._read(rs.highWaterMark);
        }
        function Transform(options) {
            if (!(this instanceof Transform)) return new Transform(options);
            Duplex.call(this, options), this._transformState = new TransformState(options, this);
            var stream = this;
            this._readableState.needReadable = !0, this._readableState.sync = !1, this.once("prefinish", function() {
                util.isFunction(this._flush) ? this._flush(function(er) {
                    done(stream, er);
                }) : done(stream);
            });
        }
        function done(stream, er) {
            if (er) return stream.emit("error", er);
            var ws = stream._writableState, ts = stream._transformState;
            if (ws.length) throw new Error("calling transform done when ws.length != 0");
            if (ts.transforming) throw new Error("calling transform done when still transforming");
            return stream.push(null);
        }
        module.exports = Transform;
        var Duplex = __webpack_require__(3), util = __webpack_require__(4);
        util.inherits = __webpack_require__(2), util.inherits(Transform, Duplex), Transform.prototype.push = function(chunk, encoding) {
            return this._transformState.needTransform = !1, Duplex.prototype.push.call(this, chunk, encoding);
        }, Transform.prototype._transform = function(chunk, encoding, cb) {
            throw new Error("not implemented");
        }, Transform.prototype._write = function(chunk, encoding, cb) {
            var ts = this._transformState;
            if (ts.writecb = cb, ts.writechunk = chunk, ts.writeencoding = encoding, !ts.transforming) {
                var rs = this._readableState;
                (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) && this._read(rs.highWaterMark);
            }
        }, Transform.prototype._read = function(n) {
            var ts = this._transformState;
            util.isNull(ts.writechunk) || !ts.writecb || ts.transforming ? ts.needTransform = !0 : (ts.transforming = !0,
            this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform));
        };
    }, function(module, exports, __webpack_require__) {
        (function(process) {
            function WriteReq(chunk, encoding, cb) {
                this.chunk = chunk, this.encoding = encoding, this.callback = cb;
            }
            function WritableState(options, stream) {
                var Duplex = __webpack_require__(3);
                options = options || {};
                var hwm = options.highWaterMark, defaultHwm = options.objectMode ? 16 : 16384;
                this.highWaterMark = hwm || 0 === hwm ? hwm : defaultHwm, this.objectMode = !!options.objectMode,
                stream instanceof Duplex && (this.objectMode = this.objectMode || !!options.writableObjectMode),
                this.highWaterMark = ~~this.highWaterMark, this.needDrain = !1, this.ending = !1,
                this.ended = !1, this.finished = !1;
                var noDecode = options.decodeStrings === !1;
                this.decodeStrings = !noDecode, this.defaultEncoding = options.defaultEncoding || "utf8",
                this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1,
                this.onwrite = function(er) {
                    onwrite(stream, er);
                }, this.writecb = null, this.writelen = 0, this.buffer = [], this.pendingcb = 0,
                this.prefinished = !1, this.errorEmitted = !1;
            }
            function Writable(options) {
                var Duplex = __webpack_require__(3);
                return this instanceof Writable || this instanceof Duplex ? (this._writableState = new WritableState(options, this),
                this.writable = !0, void Stream.call(this)) : new Writable(options);
            }
            function writeAfterEnd(stream, state, cb) {
                var er = new Error("write after end");
                stream.emit("error", er), process.nextTick(function() {
                    cb(er);
                });
            }
            function validChunk(stream, state, chunk, cb) {
                var valid = !0;
                if (!(util.isBuffer(chunk) || util.isString(chunk) || util.isNullOrUndefined(chunk) || state.objectMode)) {
                    var er = new TypeError("Invalid non-string/buffer chunk");
                    stream.emit("error", er), process.nextTick(function() {
                        cb(er);
                    }), valid = !1;
                }
                return valid;
            }
            function decodeChunk(state, chunk, encoding) {
                return !state.objectMode && state.decodeStrings !== !1 && util.isString(chunk) && (chunk = new Buffer(chunk, encoding)),
                chunk;
            }
            function writeOrBuffer(stream, state, chunk, encoding, cb) {
                chunk = decodeChunk(state, chunk, encoding), util.isBuffer(chunk) && (encoding = "buffer");
                var len = state.objectMode ? 1 : chunk.length;
                state.length += len;
                var ret = state.length < state.highWaterMark;
                return ret || (state.needDrain = !0), state.writing || state.corked ? state.buffer.push(new WriteReq(chunk, encoding, cb)) : doWrite(stream, state, !1, len, chunk, encoding, cb),
                ret;
            }
            function doWrite(stream, state, writev, len, chunk, encoding, cb) {
                state.writelen = len, state.writecb = cb, state.writing = !0, state.sync = !0, writev ? stream._writev(chunk, state.onwrite) : stream._write(chunk, encoding, state.onwrite),
                state.sync = !1;
            }
            function onwriteError(stream, state, sync, er, cb) {
                sync ? process.nextTick(function() {
                    state.pendingcb--, cb(er);
                }) : (state.pendingcb--, cb(er)), stream._writableState.errorEmitted = !0, stream.emit("error", er);
            }
            function onwriteStateUpdate(state) {
                state.writing = !1, state.writecb = null, state.length -= state.writelen, state.writelen = 0;
            }
            function onwrite(stream, er) {
                var state = stream._writableState, sync = state.sync, cb = state.writecb;
                if (onwriteStateUpdate(state), er) onwriteError(stream, state, sync, er, cb); else {
                    var finished = needFinish(stream, state);
                    finished || state.corked || state.bufferProcessing || !state.buffer.length || clearBuffer(stream, state),
                    sync ? process.nextTick(function() {
                        afterWrite(stream, state, finished, cb);
                    }) : afterWrite(stream, state, finished, cb);
                }
            }
            function afterWrite(stream, state, finished, cb) {
                finished || onwriteDrain(stream, state), state.pendingcb--, cb(), finishMaybe(stream, state);
            }
            function onwriteDrain(stream, state) {
                0 === state.length && state.needDrain && (state.needDrain = !1, stream.emit("drain"));
            }
            function clearBuffer(stream, state) {
                if (state.bufferProcessing = !0, stream._writev && state.buffer.length > 1) {
                    for (var cbs = [], c = 0; c < state.buffer.length; c++) cbs.push(state.buffer[c].callback);
                    state.pendingcb++, doWrite(stream, state, !0, state.length, state.buffer, "", function(err) {
                        for (var i = 0; i < cbs.length; i++) state.pendingcb--, cbs[i](err);
                    }), state.buffer = [];
                } else {
                    for (var c = 0; c < state.buffer.length; c++) {
                        var entry = state.buffer[c], chunk = entry.chunk, encoding = entry.encoding, cb = entry.callback, len = state.objectMode ? 1 : chunk.length;
                        if (doWrite(stream, state, !1, len, chunk, encoding, cb), state.writing) {
                            c++;
                            break;
                        }
                    }
                    c < state.buffer.length ? state.buffer = state.buffer.slice(c) : state.buffer.length = 0;
                }
                state.bufferProcessing = !1;
            }
            function needFinish(stream, state) {
                return state.ending && 0 === state.length && !state.finished && !state.writing;
            }
            function prefinish(stream, state) {
                state.prefinished || (state.prefinished = !0, stream.emit("prefinish"));
            }
            function finishMaybe(stream, state) {
                var need = needFinish(stream, state);
                return need && (0 === state.pendingcb ? (prefinish(stream, state), state.finished = !0,
                stream.emit("finish")) : prefinish(stream, state)), need;
            }
            function endWritable(stream, state, cb) {
                state.ending = !0, finishMaybe(stream, state), cb && (state.finished ? process.nextTick(cb) : stream.once("finish", cb)),
                state.ended = !0;
            }
            module.exports = Writable;
            var Buffer = __webpack_require__(1).Buffer;
            Writable.WritableState = WritableState;
            var util = __webpack_require__(4);
            util.inherits = __webpack_require__(2);
            var Stream = __webpack_require__(6);
            util.inherits(Writable, Stream), Writable.prototype.pipe = function() {
                this.emit("error", new Error("Cannot pipe. Not readable."));
            }, Writable.prototype.write = function(chunk, encoding, cb) {
                var state = this._writableState, ret = !1;
                return util.isFunction(encoding) && (cb = encoding, encoding = null), util.isBuffer(chunk) ? encoding = "buffer" : encoding || (encoding = state.defaultEncoding),
                util.isFunction(cb) || (cb = function() {}), state.ended ? writeAfterEnd(this, state, cb) : validChunk(this, state, chunk, cb) && (state.pendingcb++,
                ret = writeOrBuffer(this, state, chunk, encoding, cb)), ret;
            }, Writable.prototype.cork = function() {
                var state = this._writableState;
                state.corked++;
            }, Writable.prototype.uncork = function() {
                var state = this._writableState;
                state.corked && (state.corked--, state.writing || state.corked || state.finished || state.bufferProcessing || !state.buffer.length || clearBuffer(this, state));
            }, Writable.prototype._write = function(chunk, encoding, cb) {
                cb(new Error("not implemented"));
            }, Writable.prototype._writev = null, Writable.prototype.end = function(chunk, encoding, cb) {
                var state = this._writableState;
                util.isFunction(chunk) ? (cb = chunk, chunk = null, encoding = null) : util.isFunction(encoding) && (cb = encoding,
                encoding = null), util.isNullOrUndefined(chunk) || this.write(chunk, encoding),
                state.corked && (state.corked = 1, this.uncork()), state.ending || state.finished || endWritable(this, state, cb);
            };
        }).call(exports, __webpack_require__(5));
    }, function(module, exports) {
        function EventEmitter() {
            this._events = this._events || {}, this._maxListeners = this._maxListeners || void 0;
        }
        function isFunction(arg) {
            return "function" == typeof arg;
        }
        function isNumber(arg) {
            return "number" == typeof arg;
        }
        function isObject(arg) {
            return "object" == typeof arg && null !== arg;
        }
        function isUndefined(arg) {
            return void 0 === arg;
        }
        module.exports = EventEmitter, EventEmitter.EventEmitter = EventEmitter, EventEmitter.prototype._events = void 0,
        EventEmitter.prototype._maxListeners = void 0, EventEmitter.defaultMaxListeners = 10,
        EventEmitter.prototype.setMaxListeners = function(n) {
            if (!isNumber(n) || 0 > n || isNaN(n)) throw TypeError("n must be a positive number");
            return this._maxListeners = n, this;
        }, EventEmitter.prototype.emit = function(type) {
            var er, handler, len, args, i, listeners;
            if (this._events || (this._events = {}), "error" === type && (!this._events.error || isObject(this._events.error) && !this._events.error.length)) {
                if (er = arguments[1], er instanceof Error) throw er;
                throw TypeError('Uncaught, unspecified "error" event.');
            }
            if (handler = this._events[type], isUndefined(handler)) return !1;
            if (isFunction(handler)) switch (arguments.length) {
              case 1:
                handler.call(this);
                break;

              case 2:
                handler.call(this, arguments[1]);
                break;

              case 3:
                handler.call(this, arguments[1], arguments[2]);
                break;

              default:
                args = Array.prototype.slice.call(arguments, 1), handler.apply(this, args);
            } else if (isObject(handler)) for (args = Array.prototype.slice.call(arguments, 1),
            listeners = handler.slice(), len = listeners.length, i = 0; len > i; i++) listeners[i].apply(this, args);
            return !0;
        }, EventEmitter.prototype.addListener = function(type, listener) {
            var m;
            if (!isFunction(listener)) throw TypeError("listener must be a function");
            return this._events || (this._events = {}), this._events.newListener && this.emit("newListener", type, isFunction(listener.listener) ? listener.listener : listener),
            this._events[type] ? isObject(this._events[type]) ? this._events[type].push(listener) : this._events[type] = [ this._events[type], listener ] : this._events[type] = listener,
            isObject(this._events[type]) && !this._events[type].warned && (m = isUndefined(this._maxListeners) ? EventEmitter.defaultMaxListeners : this._maxListeners,
            m && m > 0 && this._events[type].length > m && (this._events[type].warned = !0,
            console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[type].length),
            "function" == typeof console.trace && console.trace())), this;
        }, EventEmitter.prototype.on = EventEmitter.prototype.addListener, EventEmitter.prototype.once = function(type, listener) {
            function g() {
                this.removeListener(type, g), fired || (fired = !0, listener.apply(this, arguments));
            }
            if (!isFunction(listener)) throw TypeError("listener must be a function");
            var fired = !1;
            return g.listener = listener, this.on(type, g), this;
        }, EventEmitter.prototype.removeListener = function(type, listener) {
            var list, position, length, i;
            if (!isFunction(listener)) throw TypeError("listener must be a function");
            if (!this._events || !this._events[type]) return this;
            if (list = this._events[type], length = list.length, position = -1, list === listener || isFunction(list.listener) && list.listener === listener) delete this._events[type],
            this._events.removeListener && this.emit("removeListener", type, listener); else if (isObject(list)) {
                for (i = length; i-- > 0; ) if (list[i] === listener || list[i].listener && list[i].listener === listener) {
                    position = i;
                    break;
                }
                if (0 > position) return this;
                1 === list.length ? (list.length = 0, delete this._events[type]) : list.splice(position, 1),
                this._events.removeListener && this.emit("removeListener", type, listener);
            }
            return this;
        }, EventEmitter.prototype.removeAllListeners = function(type) {
            var key, listeners;
            if (!this._events) return this;
            if (!this._events.removeListener) return 0 === arguments.length ? this._events = {} : this._events[type] && delete this._events[type],
            this;
            if (0 === arguments.length) {
                for (key in this._events) "removeListener" !== key && this.removeAllListeners(key);
                return this.removeAllListeners("removeListener"), this._events = {}, this;
            }
            if (listeners = this._events[type], isFunction(listeners)) this.removeListener(type, listeners); else if (listeners) for (;listeners.length; ) this.removeListener(type, listeners[listeners.length - 1]);
            return delete this._events[type], this;
        }, EventEmitter.prototype.listeners = function(type) {
            var ret;
            return ret = this._events && this._events[type] ? isFunction(this._events[type]) ? [ this._events[type] ] : this._events[type].slice() : [];
        }, EventEmitter.prototype.listenerCount = function(type) {
            if (this._events) {
                var evlistener = this._events[type];
                if (isFunction(evlistener)) return 1;
                if (evlistener) return evlistener.length;
            }
            return 0;
        }, EventEmitter.listenerCount = function(emitter, type) {
            return emitter.listenerCount(type);
        };
    }, function(module, exports, __webpack_require__) {
        function PassThrough(options) {
            return this instanceof PassThrough ? void Transform.call(this, options) : new PassThrough(options);
        }
        module.exports = PassThrough;
        var Transform = __webpack_require__(7), util = __webpack_require__(4);
        util.inherits = __webpack_require__(2), util.inherits(PassThrough, Transform), PassThrough.prototype._transform = function(chunk, encoding, cb) {
            cb(null, chunk);
        };
    }, function(module, exports, __webpack_require__) {
        (function(process) {
            function ReadableState(options, stream) {
                var Duplex = __webpack_require__(3);
                options = options || {};
                var hwm = options.highWaterMark, defaultHwm = options.objectMode ? 16 : 16384;
                this.highWaterMark = hwm || 0 === hwm ? hwm : defaultHwm, this.highWaterMark = ~~this.highWaterMark,
                this.buffer = [], this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null,
                this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1,
                this.emittedReadable = !1, this.readableListening = !1, this.objectMode = !!options.objectMode,
                stream instanceof Duplex && (this.objectMode = this.objectMode || !!options.readableObjectMode),
                this.defaultEncoding = options.defaultEncoding || "utf8", this.ranOut = !1, this.awaitDrain = 0,
                this.readingMore = !1, this.decoder = null, this.encoding = null, options.encoding && (StringDecoder || (StringDecoder = __webpack_require__(13).StringDecoder),
                this.decoder = new StringDecoder(options.encoding), this.encoding = options.encoding);
            }
            function Readable(options) {
                return __webpack_require__(3), this instanceof Readable ? (this._readableState = new ReadableState(options, this),
                this.readable = !0, void Stream.call(this)) : new Readable(options);
            }
            function readableAddChunk(stream, state, chunk, encoding, addToFront) {
                var er = chunkInvalid(state, chunk);
                if (er) stream.emit("error", er); else if (util.isNullOrUndefined(chunk)) state.reading = !1,
                state.ended || onEofChunk(stream, state); else if (state.objectMode || chunk && chunk.length > 0) if (state.ended && !addToFront) {
                    var e = new Error("stream.push() after EOF");
                    stream.emit("error", e);
                } else if (state.endEmitted && addToFront) {
                    var e = new Error("stream.unshift() after end event");
                    stream.emit("error", e);
                } else !state.decoder || addToFront || encoding || (chunk = state.decoder.write(chunk)),
                addToFront || (state.reading = !1), state.flowing && 0 === state.length && !state.sync ? (stream.emit("data", chunk),
                stream.read(0)) : (state.length += state.objectMode ? 1 : chunk.length, addToFront ? state.buffer.unshift(chunk) : state.buffer.push(chunk),
                state.needReadable && emitReadable(stream)), maybeReadMore(stream, state); else addToFront || (state.reading = !1);
                return needMoreData(state);
            }
            function needMoreData(state) {
                return !state.ended && (state.needReadable || state.length < state.highWaterMark || 0 === state.length);
            }
            function roundUpToNextPowerOf2(n) {
                if (n >= MAX_HWM) n = MAX_HWM; else {
                    n--;
                    for (var p = 1; 32 > p; p <<= 1) n |= n >> p;
                    n++;
                }
                return n;
            }
            function howMuchToRead(n, state) {
                return 0 === state.length && state.ended ? 0 : state.objectMode ? 0 === n ? 0 : 1 : isNaN(n) || util.isNull(n) ? state.flowing && state.buffer.length ? state.buffer[0].length : state.length : 0 >= n ? 0 : (n > state.highWaterMark && (state.highWaterMark = roundUpToNextPowerOf2(n)),
                n > state.length ? state.ended ? state.length : (state.needReadable = !0, 0) : n);
            }
            function chunkInvalid(state, chunk) {
                var er = null;
                return util.isBuffer(chunk) || util.isString(chunk) || util.isNullOrUndefined(chunk) || state.objectMode || (er = new TypeError("Invalid non-string/buffer chunk")),
                er;
            }
            function onEofChunk(stream, state) {
                if (state.decoder && !state.ended) {
                    var chunk = state.decoder.end();
                    chunk && chunk.length && (state.buffer.push(chunk), state.length += state.objectMode ? 1 : chunk.length);
                }
                state.ended = !0, emitReadable(stream);
            }
            function emitReadable(stream) {
                var state = stream._readableState;
                state.needReadable = !1, state.emittedReadable || (debug("emitReadable", state.flowing),
                state.emittedReadable = !0, state.sync ? process.nextTick(function() {
                    emitReadable_(stream);
                }) : emitReadable_(stream));
            }
            function emitReadable_(stream) {
                debug("emit readable"), stream.emit("readable"), flow(stream);
            }
            function maybeReadMore(stream, state) {
                state.readingMore || (state.readingMore = !0, process.nextTick(function() {
                    maybeReadMore_(stream, state);
                }));
            }
            function maybeReadMore_(stream, state) {
                for (var len = state.length; !state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark && (debug("maybeReadMore read 0"),
                stream.read(0), len !== state.length); ) len = state.length;
                state.readingMore = !1;
            }
            function pipeOnDrain(src) {
                return function() {
                    var state = src._readableState;
                    debug("pipeOnDrain", state.awaitDrain), state.awaitDrain && state.awaitDrain--,
                    0 === state.awaitDrain && EE.listenerCount(src, "data") && (state.flowing = !0,
                    flow(src));
                };
            }
            function resume(stream, state) {
                state.resumeScheduled || (state.resumeScheduled = !0, process.nextTick(function() {
                    resume_(stream, state);
                }));
            }
            function resume_(stream, state) {
                state.resumeScheduled = !1, stream.emit("resume"), flow(stream), state.flowing && !state.reading && stream.read(0);
            }
            function flow(stream) {
                var state = stream._readableState;
                if (debug("flow", state.flowing), state.flowing) do var chunk = stream.read(); while (null !== chunk && state.flowing);
            }
            function fromList(n, state) {
                var ret, list = state.buffer, length = state.length, stringMode = !!state.decoder, objectMode = !!state.objectMode;
                if (0 === list.length) return null;
                if (0 === length) ret = null; else if (objectMode) ret = list.shift(); else if (!n || n >= length) ret = stringMode ? list.join("") : Buffer.concat(list, length),
                list.length = 0; else if (n < list[0].length) {
                    var buf = list[0];
                    ret = buf.slice(0, n), list[0] = buf.slice(n);
                } else if (n === list[0].length) ret = list.shift(); else {
                    ret = stringMode ? "" : new Buffer(n);
                    for (var c = 0, i = 0, l = list.length; l > i && n > c; i++) {
                        var buf = list[0], cpy = Math.min(n - c, buf.length);
                        stringMode ? ret += buf.slice(0, cpy) : buf.copy(ret, c, 0, cpy), cpy < buf.length ? list[0] = buf.slice(cpy) : list.shift(),
                        c += cpy;
                    }
                }
                return ret;
            }
            function endReadable(stream) {
                var state = stream._readableState;
                if (state.length > 0) throw new Error("endReadable called on non-empty stream");
                state.endEmitted || (state.ended = !0, process.nextTick(function() {
                    state.endEmitted || 0 !== state.length || (state.endEmitted = !0, stream.readable = !1,
                    stream.emit("end"));
                }));
            }
            function forEach(xs, f) {
                for (var i = 0, l = xs.length; l > i; i++) f(xs[i], i);
            }
            function indexOf(xs, x) {
                for (var i = 0, l = xs.length; l > i; i++) if (xs[i] === x) return i;
                return -1;
            }
            module.exports = Readable;
            var isArray = __webpack_require__(20), Buffer = __webpack_require__(1).Buffer;
            Readable.ReadableState = ReadableState;
            var EE = __webpack_require__(9).EventEmitter;
            EE.listenerCount || (EE.listenerCount = function(emitter, type) {
                return emitter.listeners(type).length;
            });
            var Stream = __webpack_require__(6), util = __webpack_require__(4);
            util.inherits = __webpack_require__(2);
            var StringDecoder, debug = __webpack_require__(37);
            debug = debug && debug.debuglog ? debug.debuglog("stream") : function() {}, util.inherits(Readable, Stream),
            Readable.prototype.push = function(chunk, encoding) {
                var state = this._readableState;
                return util.isString(chunk) && !state.objectMode && (encoding = encoding || state.defaultEncoding,
                encoding !== state.encoding && (chunk = new Buffer(chunk, encoding), encoding = "")),
                readableAddChunk(this, state, chunk, encoding, !1);
            }, Readable.prototype.unshift = function(chunk) {
                var state = this._readableState;
                return readableAddChunk(this, state, chunk, "", !0);
            }, Readable.prototype.setEncoding = function(enc) {
                return StringDecoder || (StringDecoder = __webpack_require__(13).StringDecoder),
                this._readableState.decoder = new StringDecoder(enc), this._readableState.encoding = enc,
                this;
            };
            var MAX_HWM = 8388608;
            Readable.prototype.read = function(n) {
                debug("read", n);
                var state = this._readableState, nOrig = n;
                if ((!util.isNumber(n) || n > 0) && (state.emittedReadable = !1), 0 === n && state.needReadable && (state.length >= state.highWaterMark || state.ended)) return debug("read: emitReadable", state.length, state.ended),
                0 === state.length && state.ended ? endReadable(this) : emitReadable(this), null;
                if (n = howMuchToRead(n, state), 0 === n && state.ended) return 0 === state.length && endReadable(this),
                null;
                var doRead = state.needReadable;
                debug("need readable", doRead), (0 === state.length || state.length - n < state.highWaterMark) && (doRead = !0,
                debug("length less than watermark", doRead)), (state.ended || state.reading) && (doRead = !1,
                debug("reading or ended", doRead)), doRead && (debug("do read"), state.reading = !0,
                state.sync = !0, 0 === state.length && (state.needReadable = !0), this._read(state.highWaterMark),
                state.sync = !1), doRead && !state.reading && (n = howMuchToRead(nOrig, state));
                var ret;
                return ret = n > 0 ? fromList(n, state) : null, util.isNull(ret) && (state.needReadable = !0,
                n = 0), state.length -= n, 0 !== state.length || state.ended || (state.needReadable = !0),
                nOrig !== n && state.ended && 0 === state.length && endReadable(this), util.isNull(ret) || this.emit("data", ret),
                ret;
            }, Readable.prototype._read = function(n) {
                this.emit("error", new Error("not implemented"));
            }, Readable.prototype.pipe = function(dest, pipeOpts) {
                function onunpipe(readable) {
                    debug("onunpipe"), readable === src && cleanup();
                }
                function onend() {
                    debug("onend"), dest.end();
                }
                function cleanup() {
                    debug("cleanup"), dest.removeListener("close", onclose), dest.removeListener("finish", onfinish),
                    dest.removeListener("drain", ondrain), dest.removeListener("error", onerror), dest.removeListener("unpipe", onunpipe),
                    src.removeListener("end", onend), src.removeListener("end", cleanup), src.removeListener("data", ondata),
                    !state.awaitDrain || dest._writableState && !dest._writableState.needDrain || ondrain();
                }
                function ondata(chunk) {
                    debug("ondata");
                    var ret = dest.write(chunk);
                    !1 === ret && (debug("false write response, pause", src._readableState.awaitDrain),
                    src._readableState.awaitDrain++, src.pause());
                }
                function onerror(er) {
                    debug("onerror", er), unpipe(), dest.removeListener("error", onerror), 0 === EE.listenerCount(dest, "error") && dest.emit("error", er);
                }
                function onclose() {
                    dest.removeListener("finish", onfinish), unpipe();
                }
                function onfinish() {
                    debug("onfinish"), dest.removeListener("close", onclose), unpipe();
                }
                function unpipe() {
                    debug("unpipe"), src.unpipe(dest);
                }
                var src = this, state = this._readableState;
                switch (state.pipesCount) {
                  case 0:
                    state.pipes = dest;
                    break;

                  case 1:
                    state.pipes = [ state.pipes, dest ];
                    break;

                  default:
                    state.pipes.push(dest);
                }
                state.pipesCount += 1, debug("pipe count=%d opts=%j", state.pipesCount, pipeOpts);
                var doEnd = (!pipeOpts || pipeOpts.end !== !1) && dest !== process.stdout && dest !== process.stderr, endFn = doEnd ? onend : cleanup;
                state.endEmitted ? process.nextTick(endFn) : src.once("end", endFn), dest.on("unpipe", onunpipe);
                var ondrain = pipeOnDrain(src);
                return dest.on("drain", ondrain), src.on("data", ondata), dest._events && dest._events.error ? isArray(dest._events.error) ? dest._events.error.unshift(onerror) : dest._events.error = [ onerror, dest._events.error ] : dest.on("error", onerror),
                dest.once("close", onclose), dest.once("finish", onfinish), dest.emit("pipe", src),
                state.flowing || (debug("pipe resume"), src.resume()), dest;
            }, Readable.prototype.unpipe = function(dest) {
                var state = this._readableState;
                if (0 === state.pipesCount) return this;
                if (1 === state.pipesCount) return dest && dest !== state.pipes ? this : (dest || (dest = state.pipes),
                state.pipes = null, state.pipesCount = 0, state.flowing = !1, dest && dest.emit("unpipe", this),
                this);
                if (!dest) {
                    var dests = state.pipes, len = state.pipesCount;
                    state.pipes = null, state.pipesCount = 0, state.flowing = !1;
                    for (var i = 0; len > i; i++) dests[i].emit("unpipe", this);
                    return this;
                }
                var i = indexOf(state.pipes, dest);
                return -1 === i ? this : (state.pipes.splice(i, 1), state.pipesCount -= 1, 1 === state.pipesCount && (state.pipes = state.pipes[0]),
                dest.emit("unpipe", this), this);
            }, Readable.prototype.on = function(ev, fn) {
                var res = Stream.prototype.on.call(this, ev, fn);
                if ("data" === ev && !1 !== this._readableState.flowing && this.resume(), "readable" === ev && this.readable) {
                    var state = this._readableState;
                    if (!state.readableListening) if (state.readableListening = !0, state.emittedReadable = !1,
                    state.needReadable = !0, state.reading) state.length && emitReadable(this, state); else {
                        var self = this;
                        process.nextTick(function() {
                            debug("readable nexttick read 0"), self.read(0);
                        });
                    }
                }
                return res;
            }, Readable.prototype.addListener = Readable.prototype.on, Readable.prototype.resume = function() {
                var state = this._readableState;
                return state.flowing || (debug("resume"), state.flowing = !0, state.reading || (debug("resume read 0"),
                this.read(0)), resume(this, state)), this;
            }, Readable.prototype.pause = function() {
                return debug("call pause flowing=%j", this._readableState.flowing), !1 !== this._readableState.flowing && (debug("pause"),
                this._readableState.flowing = !1, this.emit("pause")), this;
            }, Readable.prototype.wrap = function(stream) {
                var state = this._readableState, paused = !1, self = this;
                stream.on("end", function() {
                    if (debug("wrapped end"), state.decoder && !state.ended) {
                        var chunk = state.decoder.end();
                        chunk && chunk.length && self.push(chunk);
                    }
                    self.push(null);
                }), stream.on("data", function(chunk) {
                    if (debug("wrapped data"), state.decoder && (chunk = state.decoder.write(chunk)),
                    chunk && (state.objectMode || chunk.length)) {
                        var ret = self.push(chunk);
                        ret || (paused = !0, stream.pause());
                    }
                });
                for (var i in stream) util.isFunction(stream[i]) && util.isUndefined(this[i]) && (this[i] = function(method) {
                    return function() {
                        return stream[method].apply(stream, arguments);
                    };
                }(i));
                var events = [ "error", "close", "destroy", "pause", "resume" ];
                return forEach(events, function(ev) {
                    stream.on(ev, self.emit.bind(self, ev));
                }), self._read = function(n) {
                    debug("wrapped _read", n), paused && (paused = !1, stream.resume());
                }, self;
            }, Readable._fromList = fromList;
        }).call(exports, __webpack_require__(5));
    }, function(module, exports) {
        (function(global) {
            function checkTypeSupport(type) {
                try {
                    return xhr.responseType = type, xhr.responseType === type;
                } catch (e) {}
                return !1;
            }
            function isFunction(value) {
                return "function" == typeof value;
            }
            exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableByteStream),
            exports.blobConstructor = !1;
            try {
                new Blob([ new ArrayBuffer(1) ]), exports.blobConstructor = !0;
            } catch (e) {}
            var xhr = new global.XMLHttpRequest();
            xhr.open("GET", global.location.host ? "/" : "https://example.com");
            var haveArrayBuffer = "undefined" != typeof global.ArrayBuffer, haveSlice = haveArrayBuffer && isFunction(global.ArrayBuffer.prototype.slice);
            exports.arraybuffer = haveArrayBuffer && checkTypeSupport("arraybuffer"), exports.msstream = !exports.fetch && haveSlice && checkTypeSupport("ms-stream"),
            exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer && checkTypeSupport("moz-chunked-arraybuffer"),
            exports.overrideMimeType = isFunction(xhr.overrideMimeType), exports.vbArray = isFunction(global.VBArray),
            xhr = null;
        }).call(exports, function() {
            return this;
        }());
    }, function(module, exports, __webpack_require__) {
        function assertEncoding(encoding) {
            if (encoding && !isBufferEncoding(encoding)) throw new Error("Unknown encoding: " + encoding);
        }
        function passThroughWrite(buffer) {
            return buffer.toString(this.encoding);
        }
        function utf16DetectIncompleteChar(buffer) {
            this.charReceived = buffer.length % 2, this.charLength = this.charReceived ? 2 : 0;
        }
        function base64DetectIncompleteChar(buffer) {
            this.charReceived = buffer.length % 3, this.charLength = this.charReceived ? 3 : 0;
        }
        var Buffer = __webpack_require__(1).Buffer, isBufferEncoding = Buffer.isEncoding || function(encoding) {
            switch (encoding && encoding.toLowerCase()) {
              case "hex":
              case "utf8":
              case "utf-8":
              case "ascii":
              case "binary":
              case "base64":
              case "ucs2":
              case "ucs-2":
              case "utf16le":
              case "utf-16le":
              case "raw":
                return !0;

              default:
                return !1;
            }
        }, StringDecoder = exports.StringDecoder = function(encoding) {
            switch (this.encoding = (encoding || "utf8").toLowerCase().replace(/[-_]/, ""),
            assertEncoding(encoding), this.encoding) {
              case "utf8":
                this.surrogateSize = 3;
                break;

              case "ucs2":
              case "utf16le":
                this.surrogateSize = 2, this.detectIncompleteChar = utf16DetectIncompleteChar;
                break;

              case "base64":
                this.surrogateSize = 3, this.detectIncompleteChar = base64DetectIncompleteChar;
                break;

              default:
                return void (this.write = passThroughWrite);
            }
            this.charBuffer = new Buffer(6), this.charReceived = 0, this.charLength = 0;
        };
        StringDecoder.prototype.write = function(buffer) {
            for (var charStr = ""; this.charLength; ) {
                var available = buffer.length >= this.charLength - this.charReceived ? this.charLength - this.charReceived : buffer.length;
                if (buffer.copy(this.charBuffer, this.charReceived, 0, available), this.charReceived += available,
                this.charReceived < this.charLength) return "";
                buffer = buffer.slice(available, buffer.length), charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);
                var charCode = charStr.charCodeAt(charStr.length - 1);
                if (!(charCode >= 55296 && 56319 >= charCode)) {
                    if (this.charReceived = this.charLength = 0, 0 === buffer.length) return charStr;
                    break;
                }
                this.charLength += this.surrogateSize, charStr = "";
            }
            this.detectIncompleteChar(buffer);
            var end = buffer.length;
            this.charLength && (buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end),
            end -= this.charReceived), charStr += buffer.toString(this.encoding, 0, end);
            var end = charStr.length - 1, charCode = charStr.charCodeAt(end);
            if (charCode >= 55296 && 56319 >= charCode) {
                var size = this.surrogateSize;
                return this.charLength += size, this.charReceived += size, this.charBuffer.copy(this.charBuffer, size, 0, size),
                buffer.copy(this.charBuffer, 0, 0, size), charStr.substring(0, end);
            }
            return charStr;
        }, StringDecoder.prototype.detectIncompleteChar = function(buffer) {
            for (var i = buffer.length >= 3 ? 3 : buffer.length; i > 0; i--) {
                var c = buffer[buffer.length - i];
                if (1 == i && c >> 5 == 6) {
                    this.charLength = 2;
                    break;
                }
                if (2 >= i && c >> 4 == 14) {
                    this.charLength = 3;
                    break;
                }
                if (3 >= i && c >> 3 == 30) {
                    this.charLength = 4;
                    break;
                }
            }
            this.charReceived = i;
        }, StringDecoder.prototype.end = function(buffer) {
            var res = "";
            if (buffer && buffer.length && (res = this.write(buffer)), this.charReceived) {
                var cr = this.charReceived, buf = this.charBuffer, enc = this.encoding;
                res += buf.slice(0, cr).toString(enc);
            }
            return res;
        };
    }, function(module, exports, __webpack_require__) {
        (function(global) {
            "use strict";
            function _interopRequireDefault(obj) {
                return obj && obj.__esModule ? obj : {
                    "default": obj
                };
            }
            function noop() {}
            function isFunction(value) {
                return "function" == typeof value;
            }
            function pump(reader, handler) {
                reader.read().then(function(result) {
                    result.done || handler(result.value) !== !1 && pump(reader, handler);
                });
            }
            function makeStream() {
                var chunks = [], cancelled = !1, completed = !1, commit = noop, rollback = noop;
                return {
                    read: function() {
                        return chunks.length > 0 ? Promise.resolve(chunks.shift()) : completed ? Promise.reject("eof") : new Promise(function(resolve, reject) {
                            commit = function() {
                                commit = noop, resolve(chunks.shift());
                            }, rollback = function(err) {
                                rollback = noop, reject(err);
                            };
                        });
                    },
                    cancel: function() {
                        cancelled = !0;
                    },
                    handler: function(chunk, err) {
                        return cancelled ? cancelled : err ? (completed = !0, rollback(err), !1) : (completed = !!chunk.done,
                        chunks.push(chunk), void commit());
                    }
                };
            }
            function fetchStream() {
                var options = arguments.length <= 0 || void 0 === arguments[0] ? {} : arguments[0], callback = arguments[1], cb = callback, stream = null;
                void 0 === cb && (stream = makeStream(), cb = stream.handler);
                var url = "string" == typeof options ? options : options.url || options.path;
                if (supportFetch) {
                    var init = "object" === ("undefined" == typeof options ? "undefined" : _typeof(options)) ? options : {};
                    fetch(url, init).then(function(res) {
                        res.status >= 200 && res.status < 300 ? pump(res.body.getReader(), _parser2["default"](cb)) : cb(null, {
                            status: res.status,
                            statusText: res.statusText
                        });
                    }, function(err) {
                        cb(null, err);
                    });
                } else !function() {
                    var parser = _parser2["default"](cb, _parser.BUFFER), opts = "object" === ("undefined" == typeof options ? "undefined" : _typeof(options)) ? _extends({}, options) : {};
                    opts.path = url;
                    var req = _streamHttp2["default"].get(opts, function(res) {
                        var status = res.status || res.statusCode;
                        return status >= 200 && 300 > status ? (res.on("data", function(buf) {
                            parser(buf) === !1 && req.abort();
                        }), void res.on("error", function(err) {
                            req.abort(), cb(null, err);
                        })) : void cb(null, {
                            status: status,
                            statusText: res.statusText || res.statusMessage
                        });
                    });
                }();
                return stream;
            }
            var _extends = Object.assign || function(target) {
                for (var i = 1; i < arguments.length; i++) {
                    var source = arguments[i];
                    for (var key in source) Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
                }
                return target;
            }, _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(obj) {
                return typeof obj;
            } : function(obj) {
                return obj && "function" == typeof Symbol && obj.constructor === Symbol ? "symbol" : typeof obj;
            };
            Object.defineProperty(exports, "__esModule", {
                value: !0
            }), exports.makeParser = void 0, exports["default"] = fetchStream;
            var _streamHttp = __webpack_require__(29), _streamHttp2 = _interopRequireDefault(_streamHttp), _parser = __webpack_require__(15), _parser2 = _interopRequireDefault(_parser), supportFetch = isFunction(global.fetch) && isFunction(global.ReadableByteStream);
            window.fetchStream = fetchStream, exports.makeParser = _parser2["default"];
        }).call(exports, function() {
            return this;
        }());
    }, function(module, exports, __webpack_require__) {
        (function(Buffer) {
            "use strict";
            function ishex(c) {
                return c >= D0 && D9 >= c || c >= LA && LZ >= c || c >= UA && UZ >= c;
            }
            function makeDecoder(chunkType) {
                switch (chunkType) {
                  case BUFFER:
                    return function(buf) {
                        return buf.toString("utf8");
                    };

                  default:
                    if (isnode) return function(a) {
                        return new Buffer(a).toString("utf8");
                    };
                    var decoder = null;
                    return function(buf) {
                        return decoder || (decoder = new TextDecoder()), decoder.decode(buf);
                    };
                }
            }
            function makeConcat(chunkType) {
                switch (chunkType) {
                  case BUFFER:
                    return function(a, b) {
                        return Buffer.concat([ a, b ]);
                    };

                  default:
                    return function(a, b) {
                        var t = new Uint8Array(a.length + b.length);
                        return t.set(a), t.set(b, a.length), t;
                    };
                }
            }
            function makeParser(callback, chunkType) {
                function readHeader(chunk) {
                    for (var i = 0; i < chunk.length; i++) {
                        var c = chunk[i];
                        if (expectLF) {
                            if (c !== LF) return state = STATE_ERROR, callback(null, new Error(errBadFormat)),
                            -1;
                            if (expectLF = !1, 0 === header.length) continue;
                            return i + 1;
                        }
                        if (c !== CR) {
                            if (0 === header.length && !ishex(c)) return state = STATE_ERROR, callback(null, errBadFormat),
                            -1;
                            header += String.fromCharCode(c);
                        } else expectLF = !0;
                    }
                    return -1;
                }
                function parse(chunk) {
                    switch (state) {
                      case STATE_ERROR:
                        throw new Error("unexpected call after error");

                      case STATE_HEADER:
                        var headerSize = readHeader(chunk);
                        if (0 > headerSize) return;
                        var i = header.indexOf(";");
                        if (bodySize = parseInt(i >= 0 ? header.substr(0, i) : header, 16), 0 === bodySize) return callback({
                            done: !0,
                            index: index
                        });
                        var chunkSize = headerSize + bodySize;
                        if (chunk.length < chunkSize) return state = STATE_BODY, void (body = chunk.slice(headerSize));
                        var head = chunk.slice(headerSize, headerSize + bodySize);
                        return callback({
                            value: decode(head),
                            index: index++
                        }) === !1 ? !1 : (header = "", chunkSize < chunk.length ? parse(chunk.slice(chunkSize)) : void 0);

                      default:
                        if (body.length + chunk.length < bodySize) return void (body = concat(body, chunk));
                        var h = chunk.slice(0, bodySize - body.length);
                        return body = concat(body, h), callback({
                            value: decode(body),
                            index: index++
                        }) === !1 ? !1 : (state = STATE_HEADER, header = "", body = null, bodySize = 0,
                        parse(chunk.slice(h.length)));
                    }
                }
                var decode = makeDecoder(chunkType), concat = makeConcat(chunkType), STATE_HEADER = 0, STATE_BODY = 1, STATE_ERROR = 2, index = 0, state = STATE_HEADER, header = "", body = null, bodySize = 0, expectLF = !1;
                return parse;
            }
            Object.defineProperty(exports, "__esModule", {
                value: !0
            }), exports["default"] = makeParser;
            var BUFFER = exports.BUFFER = "BUFFER", isnode = (exports.BYTEARRAY = "BYTEARRAY",
            "undefined" != typeof module && module.exports), CR = "\r".charCodeAt(0), LF = "\n".charCodeAt(0), D0 = "0".charCodeAt(0), D9 = "9".charCodeAt(0), LA = "a".charCodeAt(0), LZ = "z".charCodeAt(0), UA = "A".charCodeAt(0), UZ = "Z".charCodeAt(0), errBadFormat = "bad format";
        }).call(exports, __webpack_require__(1).Buffer);
    }, function(module, exports, __webpack_require__) {
        var lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        !function(exports) {
            "use strict";
            function decode(elt) {
                var code = elt.charCodeAt(0);
                return code === PLUS || code === PLUS_URL_SAFE ? 62 : code === SLASH || code === SLASH_URL_SAFE ? 63 : NUMBER > code ? -1 : NUMBER + 10 > code ? code - NUMBER + 26 + 26 : UPPER + 26 > code ? code - UPPER : LOWER + 26 > code ? code - LOWER + 26 : void 0;
            }
            function b64ToByteArray(b64) {
                function push(v) {
                    arr[L++] = v;
                }
                var i, j, l, tmp, placeHolders, arr;
                if (b64.length % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
                var len = b64.length;
                placeHolders = "=" === b64.charAt(len - 2) ? 2 : "=" === b64.charAt(len - 1) ? 1 : 0,
                arr = new Arr(3 * b64.length / 4 - placeHolders), l = placeHolders > 0 ? b64.length - 4 : b64.length;
                var L = 0;
                for (i = 0, j = 0; l > i; i += 4, j += 3) tmp = decode(b64.charAt(i)) << 18 | decode(b64.charAt(i + 1)) << 12 | decode(b64.charAt(i + 2)) << 6 | decode(b64.charAt(i + 3)),
                push((16711680 & tmp) >> 16), push((65280 & tmp) >> 8), push(255 & tmp);
                return 2 === placeHolders ? (tmp = decode(b64.charAt(i)) << 2 | decode(b64.charAt(i + 1)) >> 4,
                push(255 & tmp)) : 1 === placeHolders && (tmp = decode(b64.charAt(i)) << 10 | decode(b64.charAt(i + 1)) << 4 | decode(b64.charAt(i + 2)) >> 2,
                push(tmp >> 8 & 255), push(255 & tmp)), arr;
            }
            function uint8ToBase64(uint8) {
                function encode(num) {
                    return lookup.charAt(num);
                }
                function tripletToBase64(num) {
                    return encode(num >> 18 & 63) + encode(num >> 12 & 63) + encode(num >> 6 & 63) + encode(63 & num);
                }
                var i, temp, length, extraBytes = uint8.length % 3, output = "";
                for (i = 0, length = uint8.length - extraBytes; length > i; i += 3) temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2],
                output += tripletToBase64(temp);
                switch (extraBytes) {
                  case 1:
                    temp = uint8[uint8.length - 1], output += encode(temp >> 2), output += encode(temp << 4 & 63),
                    output += "==";
                    break;

                  case 2:
                    temp = (uint8[uint8.length - 2] << 8) + uint8[uint8.length - 1], output += encode(temp >> 10),
                    output += encode(temp >> 4 & 63), output += encode(temp << 2 & 63), output += "=";
                }
                return output;
            }
            var Arr = "undefined" != typeof Uint8Array ? Uint8Array : Array, PLUS = "+".charCodeAt(0), SLASH = "/".charCodeAt(0), NUMBER = "0".charCodeAt(0), LOWER = "a".charCodeAt(0), UPPER = "A".charCodeAt(0), PLUS_URL_SAFE = "-".charCodeAt(0), SLASH_URL_SAFE = "_".charCodeAt(0);
            exports.toByteArray = b64ToByteArray, exports.fromByteArray = uint8ToBase64;
        }(exports);
    }, function(module, exports) {
        var toString = {}.toString;
        module.exports = Array.isArray || function(arr) {
            return "[object Array]" == toString.call(arr);
        };
    }, function(module, exports) {
        module.exports = {
            "100": "Continue",
            "101": "Switching Protocols",
            "102": "Processing",
            "200": "OK",
            "201": "Created",
            "202": "Accepted",
            "203": "Non-Authoritative Information",
            "204": "No Content",
            "205": "Reset Content",
            "206": "Partial Content",
            "207": "Multi-Status",
            "300": "Multiple Choices",
            "301": "Moved Permanently",
            "302": "Moved Temporarily",
            "303": "See Other",
            "304": "Not Modified",
            "305": "Use Proxy",
            "307": "Temporary Redirect",
            "308": "Permanent Redirect",
            "400": "Bad Request",
            "401": "Unauthorized",
            "402": "Payment Required",
            "403": "Forbidden",
            "404": "Not Found",
            "405": "Method Not Allowed",
            "406": "Not Acceptable",
            "407": "Proxy Authentication Required",
            "408": "Request Time-out",
            "409": "Conflict",
            "410": "Gone",
            "411": "Length Required",
            "412": "Precondition Failed",
            "413": "Request Entity Too Large",
            "414": "Request-URI Too Large",
            "415": "Unsupported Media Type",
            "416": "Requested Range Not Satisfiable",
            "417": "Expectation Failed",
            "418": "I'm a teapot",
            "422": "Unprocessable Entity",
            "423": "Locked",
            "424": "Failed Dependency",
            "425": "Unordered Collection",
            "426": "Upgrade Required",
            "428": "Precondition Required",
            "429": "Too Many Requests",
            "431": "Request Header Fields Too Large",
            "500": "Internal Server Error",
            "501": "Not Implemented",
            "502": "Bad Gateway",
            "503": "Service Unavailable",
            "504": "Gateway Time-out",
            "505": "HTTP Version Not Supported",
            "506": "Variant Also Negotiates",
            "507": "Insufficient Storage",
            "509": "Bandwidth Limit Exceeded",
            "510": "Not Extended",
            "511": "Network Authentication Required"
        };
    }, function(module, exports) {
        exports.read = function(buffer, offset, isLE, mLen, nBytes) {
            var e, m, eLen = 8 * nBytes - mLen - 1, eMax = (1 << eLen) - 1, eBias = eMax >> 1, nBits = -7, i = isLE ? nBytes - 1 : 0, d = isLE ? -1 : 1, s = buffer[offset + i];
            for (i += d, e = s & (1 << -nBits) - 1, s >>= -nBits, nBits += eLen; nBits > 0; e = 256 * e + buffer[offset + i],
            i += d, nBits -= 8) ;
            for (m = e & (1 << -nBits) - 1, e >>= -nBits, nBits += mLen; nBits > 0; m = 256 * m + buffer[offset + i],
            i += d, nBits -= 8) ;
            if (0 === e) e = 1 - eBias; else {
                if (e === eMax) return m ? NaN : (s ? -1 : 1) * (1 / 0);
                m += Math.pow(2, mLen), e -= eBias;
            }
            return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
        }, exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
            var e, m, c, eLen = 8 * nBytes - mLen - 1, eMax = (1 << eLen) - 1, eBias = eMax >> 1, rt = 23 === mLen ? Math.pow(2, -24) - Math.pow(2, -77) : 0, i = isLE ? 0 : nBytes - 1, d = isLE ? 1 : -1, s = 0 > value || 0 === value && 0 > 1 / value ? 1 : 0;
            for (value = Math.abs(value), isNaN(value) || value === 1 / 0 ? (m = isNaN(value) ? 1 : 0,
            e = eMax) : (e = Math.floor(Math.log(value) / Math.LN2), value * (c = Math.pow(2, -e)) < 1 && (e--,
            c *= 2), value += e + eBias >= 1 ? rt / c : rt * Math.pow(2, 1 - eBias), value * c >= 2 && (e++,
            c /= 2), e + eBias >= eMax ? (m = 0, e = eMax) : e + eBias >= 1 ? (m = (value * c - 1) * Math.pow(2, mLen),
            e += eBias) : (m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen), e = 0)); mLen >= 8; buffer[offset + i] = 255 & m,
            i += d, m /= 256, mLen -= 8) ;
            for (e = e << mLen | m, eLen += mLen; eLen > 0; buffer[offset + i] = 255 & e, i += d,
            e /= 256, eLen -= 8) ;
            buffer[offset + i - d] |= 128 * s;
        };
    }, function(module, exports) {
        module.exports = Array.isArray || function(arr) {
            return "[object Array]" == Object.prototype.toString.call(arr);
        };
    }, function(module, exports) {
        "use strict";
        function hasOwnProperty(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        }
        module.exports = function(qs, sep, eq, options) {
            sep = sep || "&", eq = eq || "=";
            var obj = {};
            if ("string" != typeof qs || 0 === qs.length) return obj;
            var regexp = /\+/g;
            qs = qs.split(sep);
            var maxKeys = 1e3;
            options && "number" == typeof options.maxKeys && (maxKeys = options.maxKeys);
            var len = qs.length;
            maxKeys > 0 && len > maxKeys && (len = maxKeys);
            for (var i = 0; len > i; ++i) {
                var kstr, vstr, k, v, x = qs[i].replace(regexp, "%20"), idx = x.indexOf(eq);
                idx >= 0 ? (kstr = x.substr(0, idx), vstr = x.substr(idx + 1)) : (kstr = x, vstr = ""),
                k = decodeURIComponent(kstr), v = decodeURIComponent(vstr), hasOwnProperty(obj, k) ? Array.isArray(obj[k]) ? obj[k].push(v) : obj[k] = [ obj[k], v ] : obj[k] = v;
            }
            return obj;
        };
    }, function(module, exports) {
        "use strict";
        var stringifyPrimitive = function(v) {
            switch (typeof v) {
              case "string":
                return v;

              case "boolean":
                return v ? "true" : "false";

              case "number":
                return isFinite(v) ? v : "";

              default:
                return "";
            }
        };
        module.exports = function(obj, sep, eq, name) {
            return sep = sep || "&", eq = eq || "=", null === obj && (obj = void 0), "object" == typeof obj ? Object.keys(obj).map(function(k) {
                var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
                return Array.isArray(obj[k]) ? obj[k].map(function(v) {
                    return ks + encodeURIComponent(stringifyPrimitive(v));
                }).join(sep) : ks + encodeURIComponent(stringifyPrimitive(obj[k]));
            }).join(sep) : name ? encodeURIComponent(stringifyPrimitive(name)) + eq + encodeURIComponent(stringifyPrimitive(obj)) : "";
        };
    }, function(module, exports, __webpack_require__) {
        "use strict";
        exports.decode = exports.parse = __webpack_require__(21), exports.encode = exports.stringify = __webpack_require__(22);
    }, function(module, exports, __webpack_require__) {
        module.exports = __webpack_require__(3);
    }, function(module, exports, __webpack_require__) {
        module.exports = __webpack_require__(10);
    }, function(module, exports, __webpack_require__) {
        exports = module.exports = __webpack_require__(11), exports.Stream = __webpack_require__(6),
        exports.Readable = exports, exports.Writable = __webpack_require__(8), exports.Duplex = __webpack_require__(3),
        exports.Transform = __webpack_require__(7), exports.PassThrough = __webpack_require__(10);
    }, function(module, exports, __webpack_require__) {
        module.exports = __webpack_require__(7);
    }, function(module, exports, __webpack_require__) {
        module.exports = __webpack_require__(8);
    }, function(module, exports, __webpack_require__) {
        (function(global) {
            var ClientRequest = __webpack_require__(30), extend = __webpack_require__(36), statusCodes = __webpack_require__(18), url = __webpack_require__(34), http = exports;
            http.request = function(opts, cb) {
                opts = "string" == typeof opts ? url.parse(opts) : extend(opts);
                var defaultProtocol = -1 === global.location.protocol.search(/^https?:$/) ? "http:" : "", protocol = opts.protocol || defaultProtocol, host = opts.hostname || opts.host, port = opts.port, path = opts.path || "/";
                host && -1 !== host.indexOf(":") && (host = "[" + host + "]"), opts.url = (host ? protocol + "//" + host : "") + (port ? ":" + port : "") + path,
                opts.method = (opts.method || "GET").toUpperCase(), opts.headers = opts.headers || {};
                var req = new ClientRequest(opts);
                return cb && req.on("response", cb), req;
            }, http.get = function(opts, cb) {
                var req = http.request(opts, cb);
                return req.end(), req;
            }, http.Agent = function() {}, http.Agent.defaultMaxSockets = 4, http.STATUS_CODES = statusCodes,
            http.METHODS = [ "CHECKOUT", "CONNECT", "COPY", "DELETE", "GET", "HEAD", "LOCK", "M-SEARCH", "MERGE", "MKACTIVITY", "MKCOL", "MOVE", "NOTIFY", "OPTIONS", "PATCH", "POST", "PROPFIND", "PROPPATCH", "PURGE", "PUT", "REPORT", "SEARCH", "SUBSCRIBE", "TRACE", "UNLOCK", "UNSUBSCRIBE" ];
        }).call(exports, function() {
            return this;
        }());
    }, function(module, exports, __webpack_require__) {
        (function(Buffer, global, process) {
            function decideMode(preferBinary) {
                return capability.fetch ? "fetch" : capability.mozchunkedarraybuffer ? "moz-chunked-arraybuffer" : capability.msstream ? "ms-stream" : capability.arraybuffer && preferBinary ? "arraybuffer" : capability.vbArray && preferBinary ? "text:vbarray" : "text";
            }
            function statusValid(xhr) {
                try {
                    var status = xhr.status;
                    return null !== status && 0 !== status;
                } catch (e) {
                    return !1;
                }
            }
            var capability = __webpack_require__(12), inherits = __webpack_require__(2), response = __webpack_require__(31), stream = __webpack_require__(6), toArrayBuffer = __webpack_require__(32), IncomingMessage = response.IncomingMessage, rStates = response.readyStates, ClientRequest = module.exports = function(opts) {
                var self = this;
                stream.Writable.call(self), self._opts = opts, self._body = [], self._headers = {},
                opts.auth && self.setHeader("Authorization", "Basic " + new Buffer(opts.auth).toString("base64")),
                Object.keys(opts.headers).forEach(function(name) {
                    self.setHeader(name, opts.headers[name]);
                });
                var preferBinary;
                if ("prefer-streaming" === opts.mode) preferBinary = !1; else if ("allow-wrong-content-type" === opts.mode) preferBinary = !capability.overrideMimeType; else {
                    if (opts.mode && "default" !== opts.mode && "prefer-fast" !== opts.mode) throw new Error("Invalid value for opts.mode");
                    preferBinary = !0;
                }
                self._mode = decideMode(preferBinary), self.on("finish", function() {
                    self._onFinish();
                });
            };
            inherits(ClientRequest, stream.Writable), ClientRequest.prototype.setHeader = function(name, value) {
                var self = this, lowerName = name.toLowerCase();
                -1 === unsafeHeaders.indexOf(lowerName) && (self._headers[lowerName] = {
                    name: name,
                    value: value
                });
            }, ClientRequest.prototype.getHeader = function(name) {
                var self = this;
                return self._headers[name.toLowerCase()].value;
            }, ClientRequest.prototype.removeHeader = function(name) {
                var self = this;
                delete self._headers[name.toLowerCase()];
            }, ClientRequest.prototype._onFinish = function() {
                var self = this;
                if (!self._destroyed) {
                    var body, opts = self._opts, headersObj = self._headers;
                    if (("POST" === opts.method || "PUT" === opts.method || "PATCH" === opts.method) && (body = capability.blobConstructor ? new global.Blob(self._body.map(function(buffer) {
                        return toArrayBuffer(buffer);
                    }), {
                        type: (headersObj["content-type"] || {}).value || ""
                    }) : Buffer.concat(self._body).toString()), "fetch" === self._mode) {
                        var headers = Object.keys(headersObj).map(function(name) {
                            return [ headersObj[name].name, headersObj[name].value ];
                        });
                        global.fetch(self._opts.url, {
                            method: self._opts.method,
                            headers: headers,
                            body: body,
                            mode: "cors",
                            credentials: opts.withCredentials ? "include" : "same-origin"
                        }).then(function(response) {
                            self._fetchResponse = response, self._connect();
                        }, function(reason) {
                            self.emit("error", reason);
                        });
                    } else {
                        var xhr = self._xhr = new global.XMLHttpRequest();
                        try {
                            xhr.open(self._opts.method, self._opts.url, !0);
                        } catch (err) {
                            return void process.nextTick(function() {
                                self.emit("error", err);
                            });
                        }
                        "responseType" in xhr && (xhr.responseType = self._mode.split(":")[0]), "withCredentials" in xhr && (xhr.withCredentials = !!opts.withCredentials),
                        "text" === self._mode && "overrideMimeType" in xhr && xhr.overrideMimeType("text/plain; charset=x-user-defined"),
                        Object.keys(headersObj).forEach(function(name) {
                            xhr.setRequestHeader(headersObj[name].name, headersObj[name].value);
                        }), self._response = null, xhr.onreadystatechange = function() {
                            switch (xhr.readyState) {
                              case rStates.LOADING:
                              case rStates.DONE:
                                self._onXHRProgress();
                            }
                        }, "moz-chunked-arraybuffer" === self._mode && (xhr.onprogress = function() {
                            self._onXHRProgress();
                        }), xhr.onerror = function() {
                            self._destroyed || self.emit("error", new Error("XHR error"));
                        };
                        try {
                            xhr.send(body);
                        } catch (err) {
                            return void process.nextTick(function() {
                                self.emit("error", err);
                            });
                        }
                    }
                }
            }, ClientRequest.prototype._onXHRProgress = function() {
                var self = this;
                statusValid(self._xhr) && !self._destroyed && (self._response || self._connect(),
                self._response._onXHRProgress());
            }, ClientRequest.prototype._connect = function() {
                var self = this;
                self._destroyed || (self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode),
                self.emit("response", self._response));
            }, ClientRequest.prototype._write = function(chunk, encoding, cb) {
                var self = this;
                self._body.push(chunk), cb();
            }, ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function() {
                var self = this;
                self._destroyed = !0, self._response && (self._response._destroyed = !0), self._xhr && self._xhr.abort();
            }, ClientRequest.prototype.end = function(data, encoding, cb) {
                var self = this;
                "function" == typeof data && (cb = data, data = void 0), stream.Writable.prototype.end.call(self, data, encoding, cb);
            }, ClientRequest.prototype.flushHeaders = function() {}, ClientRequest.prototype.setTimeout = function() {},
            ClientRequest.prototype.setNoDelay = function() {}, ClientRequest.prototype.setSocketKeepAlive = function() {};
            var unsafeHeaders = [ "accept-charset", "accept-encoding", "access-control-request-headers", "access-control-request-method", "connection", "content-length", "cookie", "cookie2", "date", "dnt", "expect", "host", "keep-alive", "origin", "referer", "te", "trailer", "transfer-encoding", "upgrade", "user-agent", "via" ];
        }).call(exports, __webpack_require__(1).Buffer, function() {
            return this;
        }(), __webpack_require__(5));
    }, function(module, exports, __webpack_require__) {
        (function(process, Buffer, global) {
            var capability = __webpack_require__(12), inherits = __webpack_require__(2), stream = __webpack_require__(6), rStates = exports.readyStates = {
                UNSENT: 0,
                OPENED: 1,
                HEADERS_RECEIVED: 2,
                LOADING: 3,
                DONE: 4
            }, IncomingMessage = exports.IncomingMessage = function(xhr, response, mode) {
                function read() {
                    reader.read().then(function(result) {
                        if (!self._destroyed) {
                            if (result.done) return void self.push(null);
                            self.push(new Buffer(result.value)), read();
                        }
                    });
                }
                var self = this;
                if (stream.Readable.call(self), self._mode = mode, self.headers = {}, self.rawHeaders = [],
                self.trailers = {}, self.rawTrailers = [], self.on("end", function() {
                    process.nextTick(function() {
                        self.emit("close");
                    });
                }), "fetch" === mode) {
                    self._fetchResponse = response, self.statusCode = response.status, self.statusMessage = response.statusText;
                    for (var header, _i, _it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value,
                    !_i.done; ) self.headers[header[0].toLowerCase()] = header[1], self.rawHeaders.push(header[0], header[1]);
                    var reader = response.body.getReader();
                    read();
                } else {
                    self._xhr = xhr, self._pos = 0, self.statusCode = xhr.status, self.statusMessage = xhr.statusText;
                    var headers = xhr.getAllResponseHeaders().split(/\r?\n/);
                    if (headers.forEach(function(header) {
                        var matches = header.match(/^([^:]+):\s*(.*)/);
                        if (matches) {
                            var key = matches[1].toLowerCase();
                            void 0 !== self.headers[key] ? self.headers[key] += ", " + matches[2] : self.headers[key] = matches[2],
                            self.rawHeaders.push(matches[1], matches[2]);
                        }
                    }), self._charset = "x-user-defined", !capability.overrideMimeType) {
                        var mimeType = self.rawHeaders["mime-type"];
                        if (mimeType) {
                            var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/);
                            charsetMatch && (self._charset = charsetMatch[1].toLowerCase());
                        }
                        self._charset || (self._charset = "utf-8");
                    }
                }
            };
            inherits(IncomingMessage, stream.Readable), IncomingMessage.prototype._read = function() {},
            IncomingMessage.prototype._onXHRProgress = function() {
                var self = this, xhr = self._xhr, response = null;
                switch (self._mode) {
                  case "text:vbarray":
                    if (xhr.readyState !== rStates.DONE) break;
                    try {
                        response = new global.VBArray(xhr.responseBody).toArray();
                    } catch (e) {}
                    if (null !== response) {
                        self.push(new Buffer(response));
                        break;
                    }

                  case "text":
                    try {
                        response = xhr.responseText;
                    } catch (e) {
                        self._mode = "text:vbarray";
                        break;
                    }
                    if (response.length > self._pos) {
                        var newData = response.substr(self._pos);
                        if ("x-user-defined" === self._charset) {
                            for (var buffer = new Buffer(newData.length), i = 0; i < newData.length; i++) buffer[i] = 255 & newData.charCodeAt(i);
                            self.push(buffer);
                        } else self.push(newData, self._charset);
                        self._pos = response.length;
                    }
                    break;

                  case "arraybuffer":
                    if (xhr.readyState !== rStates.DONE) break;
                    response = xhr.response, self.push(new Buffer(new Uint8Array(response)));
                    break;

                  case "moz-chunked-arraybuffer":
                    if (response = xhr.response, xhr.readyState !== rStates.LOADING || !response) break;
                    self.push(new Buffer(new Uint8Array(response)));
                    break;

                  case "ms-stream":
                    if (response = xhr.response, xhr.readyState !== rStates.LOADING) break;
                    var reader = new global.MSStreamReader();
                    reader.onprogress = function() {
                        reader.result.byteLength > self._pos && (self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos)))),
                        self._pos = reader.result.byteLength);
                    }, reader.onload = function() {
                        self.push(null);
                    }, reader.readAsArrayBuffer(response);
                }
                self._xhr.readyState === rStates.DONE && "ms-stream" !== self._mode && self.push(null);
            };
        }).call(exports, __webpack_require__(5), __webpack_require__(1).Buffer, function() {
            return this;
        }());
    }, function(module, exports, __webpack_require__) {
        var Buffer = __webpack_require__(1).Buffer;
        module.exports = function(buf) {
            if (buf instanceof Uint8Array) {
                if (0 === buf.byteOffset && buf.byteLength === buf.buffer.byteLength) return buf.buffer;
                if ("function" == typeof buf.buffer.slice) return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            }
            if (Buffer.isBuffer(buf)) {
                for (var arrayCopy = new Uint8Array(buf.length), len = buf.length, i = 0; len > i; i++) arrayCopy[i] = buf[i];
                return arrayCopy.buffer;
            }
            throw new Error("Argument must be a Buffer");
        };
    }, function(module, exports, __webpack_require__) {
        var __WEBPACK_AMD_DEFINE_RESULT__;
        (function(module, global) {
            !function(root) {
                function error(type) {
                    throw RangeError(errors[type]);
                }
                function map(array, fn) {
                    for (var length = array.length, result = []; length--; ) result[length] = fn(array[length]);
                    return result;
                }
                function mapDomain(string, fn) {
                    var parts = string.split("@"), result = "";
                    parts.length > 1 && (result = parts[0] + "@", string = parts[1]), string = string.replace(regexSeparators, ".");
                    var labels = string.split("."), encoded = map(labels, fn).join(".");
                    return result + encoded;
                }
                function ucs2decode(string) {
                    for (var value, extra, output = [], counter = 0, length = string.length; length > counter; ) value = string.charCodeAt(counter++),
                    value >= 55296 && 56319 >= value && length > counter ? (extra = string.charCodeAt(counter++),
                    56320 == (64512 & extra) ? output.push(((1023 & value) << 10) + (1023 & extra) + 65536) : (output.push(value),
                    counter--)) : output.push(value);
                    return output;
                }
                function ucs2encode(array) {
                    return map(array, function(value) {
                        var output = "";
                        return value > 65535 && (value -= 65536, output += stringFromCharCode(value >>> 10 & 1023 | 55296),
                        value = 56320 | 1023 & value), output += stringFromCharCode(value);
                    }).join("");
                }
                function basicToDigit(codePoint) {
                    return 10 > codePoint - 48 ? codePoint - 22 : 26 > codePoint - 65 ? codePoint - 65 : 26 > codePoint - 97 ? codePoint - 97 : base;
                }
                function digitToBasic(digit, flag) {
                    return digit + 22 + 75 * (26 > digit) - ((0 != flag) << 5);
                }
                function adapt(delta, numPoints, firstTime) {
                    var k = 0;
                    for (delta = firstTime ? floor(delta / damp) : delta >> 1, delta += floor(delta / numPoints); delta > baseMinusTMin * tMax >> 1; k += base) delta = floor(delta / baseMinusTMin);
                    return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
                }
                function decode(input) {
                    var out, basic, j, index, oldi, w, k, digit, t, baseMinusT, output = [], inputLength = input.length, i = 0, n = initialN, bias = initialBias;
                    for (basic = input.lastIndexOf(delimiter), 0 > basic && (basic = 0), j = 0; basic > j; ++j) input.charCodeAt(j) >= 128 && error("not-basic"),
                    output.push(input.charCodeAt(j));
                    for (index = basic > 0 ? basic + 1 : 0; inputLength > index; ) {
                        for (oldi = i, w = 1, k = base; index >= inputLength && error("invalid-input"),
                        digit = basicToDigit(input.charCodeAt(index++)), (digit >= base || digit > floor((maxInt - i) / w)) && error("overflow"),
                        i += digit * w, t = bias >= k ? tMin : k >= bias + tMax ? tMax : k - bias, !(t > digit); k += base) baseMinusT = base - t,
                        w > floor(maxInt / baseMinusT) && error("overflow"), w *= baseMinusT;
                        out = output.length + 1, bias = adapt(i - oldi, out, 0 == oldi), floor(i / out) > maxInt - n && error("overflow"),
                        n += floor(i / out), i %= out, output.splice(i++, 0, n);
                    }
                    return ucs2encode(output);
                }
                function encode(input) {
                    var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, inputLength, handledCPCountPlusOne, baseMinusT, qMinusT, output = [];
                    for (input = ucs2decode(input), inputLength = input.length, n = initialN, delta = 0,
                    bias = initialBias, j = 0; inputLength > j; ++j) currentValue = input[j], 128 > currentValue && output.push(stringFromCharCode(currentValue));
                    for (handledCPCount = basicLength = output.length, basicLength && output.push(delimiter); inputLength > handledCPCount; ) {
                        for (m = maxInt, j = 0; inputLength > j; ++j) currentValue = input[j], currentValue >= n && m > currentValue && (m = currentValue);
                        for (handledCPCountPlusOne = handledCPCount + 1, m - n > floor((maxInt - delta) / handledCPCountPlusOne) && error("overflow"),
                        delta += (m - n) * handledCPCountPlusOne, n = m, j = 0; inputLength > j; ++j) if (currentValue = input[j],
                        n > currentValue && ++delta > maxInt && error("overflow"), currentValue == n) {
                            for (q = delta, k = base; t = bias >= k ? tMin : k >= bias + tMax ? tMax : k - bias,
                            !(t > q); k += base) qMinusT = q - t, baseMinusT = base - t, output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))),
                            q = floor(qMinusT / baseMinusT);
                            output.push(stringFromCharCode(digitToBasic(q, 0))), bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength),
                            delta = 0, ++handledCPCount;
                        }
                        ++delta, ++n;
                    }
                    return output.join("");
                }
                function toUnicode(input) {
                    return mapDomain(input, function(string) {
                        return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
                    });
                }
                function toASCII(input) {
                    return mapDomain(input, function(string) {
                        return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
                    });
                }
                var freeGlobal = ("object" == typeof exports && exports && !exports.nodeType && exports,
                "object" == typeof module && module && !module.nodeType && module, "object" == typeof global && global);
                (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) && (root = freeGlobal);
                var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
                    overflow: "Overflow: input needs wider integers to process",
                    "not-basic": "Illegal input >= 0x80 (not a basic code point)",
                    "invalid-input": "Invalid input"
                }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode;
                punycode = {
                    version: "1.3.2",
                    ucs2: {
                        decode: ucs2decode,
                        encode: ucs2encode
                    },
                    decode: decode,
                    encode: encode,
                    toASCII: toASCII,
                    toUnicode: toUnicode
                }, __WEBPACK_AMD_DEFINE_RESULT__ = function() {
                    return punycode;
                }.call(exports, __webpack_require__, exports, module), !(void 0 !== __WEBPACK_AMD_DEFINE_RESULT__ && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
            }(this);
        }).call(exports, __webpack_require__(35)(module), function() {
            return this;
        }());
    }, function(module, exports, __webpack_require__) {
        function Url() {
            this.protocol = null, this.slashes = null, this.auth = null, this.host = null, this.port = null,
            this.hostname = null, this.hash = null, this.search = null, this.query = null, this.pathname = null,
            this.path = null, this.href = null;
        }
        function urlParse(url, parseQueryString, slashesDenoteHost) {
            if (url && isObject(url) && url instanceof Url) return url;
            var u = new Url();
            return u.parse(url, parseQueryString, slashesDenoteHost), u;
        }
        function urlFormat(obj) {
            return isString(obj) && (obj = urlParse(obj)), obj instanceof Url ? obj.format() : Url.prototype.format.call(obj);
        }
        function urlResolve(source, relative) {
            return urlParse(source, !1, !0).resolve(relative);
        }
        function urlResolveObject(source, relative) {
            return source ? urlParse(source, !1, !0).resolveObject(relative) : relative;
        }
        function isString(arg) {
            return "string" == typeof arg;
        }
        function isObject(arg) {
            return "object" == typeof arg && null !== arg;
        }
        function isNull(arg) {
            return null === arg;
        }
        function isNullOrUndefined(arg) {
            return null == arg;
        }
        var punycode = __webpack_require__(33);
        exports.parse = urlParse, exports.resolve = urlResolve, exports.resolveObject = urlResolveObject,
        exports.format = urlFormat, exports.Url = Url;
        var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]*$/, delims = [ "<", ">", '"', "`", " ", "\r", "\n", "	" ], unwise = [ "{", "}", "|", "\\", "^", "`" ].concat(delims), autoEscape = [ "'" ].concat(unwise), nonHostChars = [ "%", "/", "?", ";", "#" ].concat(autoEscape), hostEndingChars = [ "/", "?", "#" ], hostnameMaxLen = 255, hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/, hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/, unsafeProtocol = {
            javascript: !0,
            "javascript:": !0
        }, hostlessProtocol = {
            javascript: !0,
            "javascript:": !0
        }, slashedProtocol = {
            http: !0,
            https: !0,
            ftp: !0,
            gopher: !0,
            file: !0,
            "http:": !0,
            "https:": !0,
            "ftp:": !0,
            "gopher:": !0,
            "file:": !0
        }, querystring = __webpack_require__(23);
        Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
            if (!isString(url)) throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
            var rest = url;
            rest = rest.trim();
            var proto = protocolPattern.exec(rest);
            if (proto) {
                proto = proto[0];
                var lowerProto = proto.toLowerCase();
                this.protocol = lowerProto, rest = rest.substr(proto.length);
            }
            if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
                var slashes = "//" === rest.substr(0, 2);
                !slashes || proto && hostlessProtocol[proto] || (rest = rest.substr(2), this.slashes = !0);
            }
            if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
                for (var hostEnd = -1, i = 0; i < hostEndingChars.length; i++) {
                    var hec = rest.indexOf(hostEndingChars[i]);
                    -1 !== hec && (-1 === hostEnd || hostEnd > hec) && (hostEnd = hec);
                }
                var auth, atSign;
                atSign = -1 === hostEnd ? rest.lastIndexOf("@") : rest.lastIndexOf("@", hostEnd),
                -1 !== atSign && (auth = rest.slice(0, atSign), rest = rest.slice(atSign + 1), this.auth = decodeURIComponent(auth)),
                hostEnd = -1;
                for (var i = 0; i < nonHostChars.length; i++) {
                    var hec = rest.indexOf(nonHostChars[i]);
                    -1 !== hec && (-1 === hostEnd || hostEnd > hec) && (hostEnd = hec);
                }
                -1 === hostEnd && (hostEnd = rest.length), this.host = rest.slice(0, hostEnd), rest = rest.slice(hostEnd),
                this.parseHost(), this.hostname = this.hostname || "";
                var ipv6Hostname = "[" === this.hostname[0] && "]" === this.hostname[this.hostname.length - 1];
                if (!ipv6Hostname) for (var hostparts = this.hostname.split(/\./), i = 0, l = hostparts.length; l > i; i++) {
                    var part = hostparts[i];
                    if (part && !part.match(hostnamePartPattern)) {
                        for (var newpart = "", j = 0, k = part.length; k > j; j++) newpart += part.charCodeAt(j) > 127 ? "x" : part[j];
                        if (!newpart.match(hostnamePartPattern)) {
                            var validParts = hostparts.slice(0, i), notHost = hostparts.slice(i + 1), bit = part.match(hostnamePartStart);
                            bit && (validParts.push(bit[1]), notHost.unshift(bit[2])), notHost.length && (rest = "/" + notHost.join(".") + rest),
                            this.hostname = validParts.join(".");
                            break;
                        }
                    }
                }
                if (this.hostname.length > hostnameMaxLen ? this.hostname = "" : this.hostname = this.hostname.toLowerCase(),
                !ipv6Hostname) {
                    for (var domainArray = this.hostname.split("."), newOut = [], i = 0; i < domainArray.length; ++i) {
                        var s = domainArray[i];
                        newOut.push(s.match(/[^A-Za-z0-9_-]/) ? "xn--" + punycode.encode(s) : s);
                    }
                    this.hostname = newOut.join(".");
                }
                var p = this.port ? ":" + this.port : "", h = this.hostname || "";
                this.host = h + p, this.href += this.host, ipv6Hostname && (this.hostname = this.hostname.substr(1, this.hostname.length - 2),
                "/" !== rest[0] && (rest = "/" + rest));
            }
            if (!unsafeProtocol[lowerProto]) for (var i = 0, l = autoEscape.length; l > i; i++) {
                var ae = autoEscape[i], esc = encodeURIComponent(ae);
                esc === ae && (esc = escape(ae)), rest = rest.split(ae).join(esc);
            }
            var hash = rest.indexOf("#");
            -1 !== hash && (this.hash = rest.substr(hash), rest = rest.slice(0, hash));
            var qm = rest.indexOf("?");
            if (-1 !== qm ? (this.search = rest.substr(qm), this.query = rest.substr(qm + 1),
            parseQueryString && (this.query = querystring.parse(this.query)), rest = rest.slice(0, qm)) : parseQueryString && (this.search = "",
            this.query = {}), rest && (this.pathname = rest), slashedProtocol[lowerProto] && this.hostname && !this.pathname && (this.pathname = "/"),
            this.pathname || this.search) {
                var p = this.pathname || "", s = this.search || "";
                this.path = p + s;
            }
            return this.href = this.format(), this;
        }, Url.prototype.format = function() {
            var auth = this.auth || "";
            auth && (auth = encodeURIComponent(auth), auth = auth.replace(/%3A/i, ":"), auth += "@");
            var protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = !1, query = "";
            this.host ? host = auth + this.host : this.hostname && (host = auth + (-1 === this.hostname.indexOf(":") ? this.hostname : "[" + this.hostname + "]"),
            this.port && (host += ":" + this.port)), this.query && isObject(this.query) && Object.keys(this.query).length && (query = querystring.stringify(this.query));
            var search = this.search || query && "?" + query || "";
            return protocol && ":" !== protocol.substr(-1) && (protocol += ":"), this.slashes || (!protocol || slashedProtocol[protocol]) && host !== !1 ? (host = "//" + (host || ""),
            pathname && "/" !== pathname.charAt(0) && (pathname = "/" + pathname)) : host || (host = ""),
            hash && "#" !== hash.charAt(0) && (hash = "#" + hash), search && "?" !== search.charAt(0) && (search = "?" + search),
            pathname = pathname.replace(/[?#]/g, function(match) {
                return encodeURIComponent(match);
            }), search = search.replace("#", "%23"), protocol + host + pathname + search + hash;
        }, Url.prototype.resolve = function(relative) {
            return this.resolveObject(urlParse(relative, !1, !0)).format();
        }, Url.prototype.resolveObject = function(relative) {
            if (isString(relative)) {
                var rel = new Url();
                rel.parse(relative, !1, !0), relative = rel;
            }
            var result = new Url();
            if (Object.keys(this).forEach(function(k) {
                result[k] = this[k];
            }, this), result.hash = relative.hash, "" === relative.href) return result.href = result.format(),
            result;
            if (relative.slashes && !relative.protocol) return Object.keys(relative).forEach(function(k) {
                "protocol" !== k && (result[k] = relative[k]);
            }), slashedProtocol[result.protocol] && result.hostname && !result.pathname && (result.path = result.pathname = "/"),
            result.href = result.format(), result;
            if (relative.protocol && relative.protocol !== result.protocol) {
                if (!slashedProtocol[relative.protocol]) return Object.keys(relative).forEach(function(k) {
                    result[k] = relative[k];
                }), result.href = result.format(), result;
                if (result.protocol = relative.protocol, relative.host || hostlessProtocol[relative.protocol]) result.pathname = relative.pathname; else {
                    for (var relPath = (relative.pathname || "").split("/"); relPath.length && !(relative.host = relPath.shift()); ) ;
                    relative.host || (relative.host = ""), relative.hostname || (relative.hostname = ""),
                    "" !== relPath[0] && relPath.unshift(""), relPath.length < 2 && relPath.unshift(""),
                    result.pathname = relPath.join("/");
                }
                if (result.search = relative.search, result.query = relative.query, result.host = relative.host || "",
                result.auth = relative.auth, result.hostname = relative.hostname || relative.host,
                result.port = relative.port, result.pathname || result.search) {
                    var p = result.pathname || "", s = result.search || "";
                    result.path = p + s;
                }
                return result.slashes = result.slashes || relative.slashes, result.href = result.format(),
                result;
            }
            var isSourceAbs = result.pathname && "/" === result.pathname.charAt(0), isRelAbs = relative.host || relative.pathname && "/" === relative.pathname.charAt(0), mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [], relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
            if (psychotic && (result.hostname = "", result.port = null, result.host && ("" === srcPath[0] ? srcPath[0] = result.host : srcPath.unshift(result.host)),
            result.host = "", relative.protocol && (relative.hostname = null, relative.port = null,
            relative.host && ("" === relPath[0] ? relPath[0] = relative.host : relPath.unshift(relative.host)),
            relative.host = null), mustEndAbs = mustEndAbs && ("" === relPath[0] || "" === srcPath[0])),
            isRelAbs) result.host = relative.host || "" === relative.host ? relative.host : result.host,
            result.hostname = relative.hostname || "" === relative.hostname ? relative.hostname : result.hostname,
            result.search = relative.search, result.query = relative.query, srcPath = relPath; else if (relPath.length) srcPath || (srcPath = []),
            srcPath.pop(), srcPath = srcPath.concat(relPath), result.search = relative.search,
            result.query = relative.query; else if (!isNullOrUndefined(relative.search)) {
                if (psychotic) {
                    result.hostname = result.host = srcPath.shift();
                    var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : !1;
                    authInHost && (result.auth = authInHost.shift(), result.host = result.hostname = authInHost.shift());
                }
                return result.search = relative.search, result.query = relative.query, isNull(result.pathname) && isNull(result.search) || (result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "")),
                result.href = result.format(), result;
            }
            if (!srcPath.length) return result.pathname = null, result.search ? result.path = "/" + result.search : result.path = null,
            result.href = result.format(), result;
            for (var last = srcPath.slice(-1)[0], hasTrailingSlash = (result.host || relative.host) && ("." === last || ".." === last) || "" === last, up = 0, i = srcPath.length; i >= 0; i--) last = srcPath[i],
            "." == last ? srcPath.splice(i, 1) : ".." === last ? (srcPath.splice(i, 1), up++) : up && (srcPath.splice(i, 1),
            up--);
            if (!mustEndAbs && !removeAllDots) for (;up--; up) srcPath.unshift("..");
            !mustEndAbs || "" === srcPath[0] || srcPath[0] && "/" === srcPath[0].charAt(0) || srcPath.unshift(""),
            hasTrailingSlash && "/" !== srcPath.join("/").substr(-1) && srcPath.push("");
            var isAbsolute = "" === srcPath[0] || srcPath[0] && "/" === srcPath[0].charAt(0);
            if (psychotic) {
                result.hostname = result.host = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
                var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : !1;
                authInHost && (result.auth = authInHost.shift(), result.host = result.hostname = authInHost.shift());
            }
            return mustEndAbs = mustEndAbs || result.host && srcPath.length, mustEndAbs && !isAbsolute && srcPath.unshift(""),
            srcPath.length ? result.pathname = srcPath.join("/") : (result.pathname = null,
            result.path = null), isNull(result.pathname) && isNull(result.search) || (result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "")),
            result.auth = relative.auth || result.auth, result.slashes = result.slashes || relative.slashes,
            result.href = result.format(), result;
        }, Url.prototype.parseHost = function() {
            var host = this.host, port = portPattern.exec(host);
            port && (port = port[0], ":" !== port && (this.port = port.substr(1)), host = host.substr(0, host.length - port.length)),
            host && (this.hostname = host);
        };
    }, function(module, exports) {
        module.exports = function(module) {
            return module.webpackPolyfill || (module.deprecate = function() {}, module.paths = [],
            module.children = [], module.webpackPolyfill = 1), module;
        };
    }, function(module, exports) {
        function extend() {
            for (var target = {}, i = 0; i < arguments.length; i++) {
                var source = arguments[i];
                for (var key in source) hasOwnProperty.call(source, key) && (target[key] = source[key]);
            }
            return target;
        }
        module.exports = extend;
        var hasOwnProperty = Object.prototype.hasOwnProperty;
    }, function(module, exports) {} ]), function($) {
        $.fn.attrs = function() {
            for (var map = {}, attrs = this[0].attributes, i = 0; i < attrs.length; i++) {
                var name = attrs[i].name;
                map[name.toLowerCase()] = attrs[i].value;
            }
            return map;
        }, $.fn.spin.presets.load = {
            lines: 13,
            length: 16,
            width: 6,
            radius: 18,
            corners: 1,
            rotate: 0,
            direction: 1,
            color: "#000",
            speed: 1,
            trail: 60,
            shadow: !0,
            hwaccel: !0,
            className: "spinner",
            left: "50%",
            top: "50%"
        };
    }(jQuery), parseUri.options = {
        strictMode: !1,
        key: [ "source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor" ],
        q: {
            name: "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };
		if (typeof exports !== 'undefined') {
			module.exports = createViewer;
		} else {
			window.GrapeCity = {
				ActiveReports: {
						Viewer: createViewer
				}
			};
		}
}(window);
