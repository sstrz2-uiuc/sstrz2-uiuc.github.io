(function () {
  'use strict';

  function ascending$2(a, b) {
    return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function descending(a, b) {
    return a == null || b == null ? NaN
      : b < a ? -1
      : b > a ? 1
      : b >= a ? 0
      : NaN;
  }

  function bisector(f) {
    let compare1, compare2, delta;

    // If an accessor is specified, promote it to a comparator. In this case we
    // can test whether the search value is (self-) comparable. We can’t do this
    // for a comparator (except for specific, known comparators) because we can’t
    // tell if the comparator is symmetric, and an asymmetric comparator can’t be
    // used to test whether a single value is comparable.
    if (f.length !== 2) {
      compare1 = ascending$2;
      compare2 = (d, x) => ascending$2(f(d), x);
      delta = (d, x) => f(d) - x;
    } else {
      compare1 = f === ascending$2 || f === descending ? f : zero$1;
      compare2 = f;
      delta = f;
    }

    function left(a, x, lo = 0, hi = a.length) {
      if (lo < hi) {
        if (compare1(x, x) !== 0) return hi;
        do {
          const mid = (lo + hi) >>> 1;
          if (compare2(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        } while (lo < hi);
      }
      return lo;
    }

    function right(a, x, lo = 0, hi = a.length) {
      if (lo < hi) {
        if (compare1(x, x) !== 0) return hi;
        do {
          const mid = (lo + hi) >>> 1;
          if (compare2(a[mid], x) <= 0) lo = mid + 1;
          else hi = mid;
        } while (lo < hi);
      }
      return lo;
    }

    function center(a, x, lo = 0, hi = a.length) {
      const i = left(a, x, lo, hi - 1);
      return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
    }

    return {left, center, right};
  }

  function zero$1() {
    return 0;
  }

  function number$2(x) {
    return x === null ? NaN : +x;
  }

  function* numbers(values, valueof) {
    {
      for (let value of values) {
        if (value != null && (value = +value) >= value) {
          yield value;
        }
      }
    }
  }

  const ascendingBisect = bisector(ascending$2);
  const bisectRight = ascendingBisect.right;
  bisector(number$2).center;

  class InternMap extends Map {
    constructor(entries, key = keyof) {
      super();
      Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
      if (entries != null) for (const [key, value] of entries) this.set(key, value);
    }
    get(key) {
      return super.get(intern_get(this, key));
    }
    has(key) {
      return super.has(intern_get(this, key));
    }
    set(key, value) {
      return super.set(intern_set(this, key), value);
    }
    delete(key) {
      return super.delete(intern_delete(this, key));
    }
  }

  function intern_get({_intern, _key}, value) {
    const key = _key(value);
    return _intern.has(key) ? _intern.get(key) : value;
  }

  function intern_set({_intern, _key}, value) {
    const key = _key(value);
    if (_intern.has(key)) return _intern.get(key);
    _intern.set(key, value);
    return value;
  }

  function intern_delete({_intern, _key}, value) {
    const key = _key(value);
    if (_intern.has(key)) {
      value = _intern.get(key);
      _intern.delete(key);
    }
    return value;
  }

  function keyof(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }

  function identity$4(x) {
    return x;
  }

  function rollup(values, reduce, ...keys) {
    return nest(values, identity$4, reduce, keys);
  }

  function nest(values, map, reduce, keys) {
    return (function regroup(values, i) {
      if (i >= keys.length) return reduce(values);
      const groups = new InternMap();
      const keyof = keys[i++];
      let index = -1;
      for (const value of values) {
        const key = keyof(value, ++index, values);
        const group = groups.get(key);
        if (group) group.push(value);
        else groups.set(key, [value]);
      }
      for (const [key, values] of groups) {
        groups.set(key, regroup(values, i));
      }
      return map(groups);
    })(values, 0);
  }

  function compareDefined(compare = ascending$2) {
    if (compare === ascending$2) return ascendingDefined;
    if (typeof compare !== "function") throw new TypeError("compare is not a function");
    return (a, b) => {
      const x = compare(a, b);
      if (x || x === 0) return x;
      return (compare(b, b) === 0) - (compare(a, a) === 0);
    };
  }

  function ascendingDefined(a, b) {
    return (a == null || !(a >= a)) - (b == null || !(b >= b)) || (a < b ? -1 : a > b ? 1 : 0);
  }

  const e10 = Math.sqrt(50),
      e5 = Math.sqrt(10),
      e2 = Math.sqrt(2);

  function tickSpec(start, stop, count) {
    const step = (stop - start) / Math.max(0, count),
        power = Math.floor(Math.log10(step)),
        error = step / Math.pow(10, power),
        factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
    let i1, i2, inc;
    if (power < 0) {
      inc = Math.pow(10, -power) / factor;
      i1 = Math.round(start * inc);
      i2 = Math.round(stop * inc);
      if (i1 / inc < start) ++i1;
      if (i2 / inc > stop) --i2;
      inc = -inc;
    } else {
      inc = Math.pow(10, power) * factor;
      i1 = Math.round(start / inc);
      i2 = Math.round(stop / inc);
      if (i1 * inc < start) ++i1;
      if (i2 * inc > stop) --i2;
    }
    if (i2 < i1 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
    return [i1, i2, inc];
  }

  function ticks(start, stop, count) {
    stop = +stop, start = +start, count = +count;
    if (!(count > 0)) return [];
    if (start === stop) return [start];
    const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
    if (!(i2 >= i1)) return [];
    const n = i2 - i1 + 1, ticks = new Array(n);
    if (reverse) {
      if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
      else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
    } else {
      if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
      else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
    }
    return ticks;
  }

  function tickIncrement(start, stop, count) {
    stop = +stop, start = +start, count = +count;
    return tickSpec(start, stop, count)[2];
  }

  function tickStep(start, stop, count) {
    stop = +stop, start = +start, count = +count;
    const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
    return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
  }

  function max(values, valueof) {
    let max;
    {
      for (const value of values) {
        if (value != null
            && (max < value || (max === undefined && value >= value))) {
          max = value;
        }
      }
    }
    return max;
  }

  function min(values, valueof) {
    let min;
    {
      for (const value of values) {
        if (value != null
            && (min > value || (min === undefined && value >= value))) {
          min = value;
        }
      }
    }
    return min;
  }

  // Based on https://github.com/mourner/quickselect
  // ISC license, Copyright 2018 Vladimir Agafonkin.
  function quickselect(array, k, left = 0, right = Infinity, compare) {
    k = Math.floor(k);
    left = Math.floor(Math.max(0, left));
    right = Math.floor(Math.min(array.length - 1, right));

    if (!(left <= k && k <= right)) return array;

    compare = compare === undefined ? ascendingDefined : compareDefined(compare);

    while (right > left) {
      if (right - left > 600) {
        const n = right - left + 1;
        const m = k - left + 1;
        const z = Math.log(n);
        const s = 0.5 * Math.exp(2 * z / 3);
        const sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
        const newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
        const newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
        quickselect(array, k, newLeft, newRight, compare);
      }

      const t = array[k];
      let i = left;
      let j = right;

      swap(array, left, k);
      if (compare(array[right], t) > 0) swap(array, left, right);

      while (i < j) {
        swap(array, i, j), ++i, --j;
        while (compare(array[i], t) < 0) ++i;
        while (compare(array[j], t) > 0) --j;
      }

      if (compare(array[left], t) === 0) swap(array, left, j);
      else ++j, swap(array, j, right);

      if (j <= k) left = j + 1;
      if (k <= j) right = j - 1;
    }

    return array;
  }

  function swap(array, i, j) {
    const t = array[i];
    array[i] = array[j];
    array[j] = t;
  }

  function quantile(values, p, valueof) {
    values = Float64Array.from(numbers(values));
    if (!(n = values.length) || isNaN(p = +p)) return;
    if (p <= 0 || n < 2) return min(values);
    if (p >= 1) return max(values);
    var n,
        i = (n - 1) * p,
        i0 = Math.floor(i),
        value0 = max(quickselect(values, i0).subarray(0, i0 + 1)),
        value1 = min(values.subarray(i0 + 1));
    return value0 + (value1 - value0) * (i - i0);
  }

  function mean(values, valueof) {
    let count = 0;
    let sum = 0;
    if (valueof === undefined) {
      for (let value of values) {
        if (value != null && (value = +value) >= value) {
          ++count, sum += value;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
          ++count, sum += value;
        }
      }
    }
    if (count) return sum / count;
  }

  function sum(values, valueof) {
    let sum = 0;
    if (valueof === undefined) {
      for (let value of values) {
        if (value = +value) {
          sum += value;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if (value = +valueof(value, ++index, values)) {
          sum += value;
        }
      }
    }
    return sum;
  }

  function identity$3(x) {
    return x;
  }

  var top = 1,
      right = 2,
      bottom = 3,
      left = 4,
      epsilon$3 = 1e-6;

  function translateX(x) {
    return "translate(" + x + ",0)";
  }

  function translateY(y) {
    return "translate(0," + y + ")";
  }

  function number$1(scale) {
    return d => +scale(d);
  }

  function center(scale, offset) {
    offset = Math.max(0, scale.bandwidth() - offset * 2) / 2;
    if (scale.round()) offset = Math.round(offset);
    return d => +scale(d) + offset;
  }

  function entering() {
    return !this.__axis;
  }

  function axis(orient, scale) {
    var tickArguments = [],
        tickValues = null,
        tickFormat = null,
        tickSizeInner = 6,
        tickSizeOuter = 6,
        tickPadding = 3,
        offset = typeof window !== "undefined" && window.devicePixelRatio > 1 ? 0 : 0.5,
        k = orient === top || orient === left ? -1 : 1,
        x = orient === left || orient === right ? "x" : "y",
        transform = orient === top || orient === bottom ? translateX : translateY;

    function axis(context) {
      var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
          format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$3) : tickFormat,
          spacing = Math.max(tickSizeInner, 0) + tickPadding,
          range = scale.range(),
          range0 = +range[0] + offset,
          range1 = +range[range.length - 1] + offset,
          position = (scale.bandwidth ? center : number$1)(scale.copy(), offset),
          selection = context.selection ? context.selection() : context,
          path = selection.selectAll(".domain").data([null]),
          tick = selection.selectAll(".tick").data(values, scale).order(),
          tickExit = tick.exit(),
          tickEnter = tick.enter().append("g").attr("class", "tick"),
          line = tick.select("line"),
          text = tick.select("text");

      path = path.merge(path.enter().insert("path", ".tick")
          .attr("class", "domain")
          .attr("stroke", "currentColor"));

      tick = tick.merge(tickEnter);

      line = line.merge(tickEnter.append("line")
          .attr("stroke", "currentColor")
          .attr(x + "2", k * tickSizeInner));

      text = text.merge(tickEnter.append("text")
          .attr("fill", "currentColor")
          .attr(x, k * spacing)
          .attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

      if (context !== selection) {
        path = path.transition(context);
        tick = tick.transition(context);
        line = line.transition(context);
        text = text.transition(context);

        tickExit = tickExit.transition(context)
            .attr("opacity", epsilon$3)
            .attr("transform", function(d) { return isFinite(d = position(d)) ? transform(d + offset) : this.getAttribute("transform"); });

        tickEnter
            .attr("opacity", epsilon$3)
            .attr("transform", function(d) { var p = this.parentNode.__axis; return transform((p && isFinite(p = p(d)) ? p : position(d)) + offset); });
      }

      tickExit.remove();

      path
          .attr("d", orient === left || orient === right
              ? (tickSizeOuter ? "M" + k * tickSizeOuter + "," + range0 + "H" + offset + "V" + range1 + "H" + k * tickSizeOuter : "M" + offset + "," + range0 + "V" + range1)
              : (tickSizeOuter ? "M" + range0 + "," + k * tickSizeOuter + "V" + offset + "H" + range1 + "V" + k * tickSizeOuter : "M" + range0 + "," + offset + "H" + range1));

      tick
          .attr("opacity", 1)
          .attr("transform", function(d) { return transform(position(d) + offset); });

      line
          .attr(x + "2", k * tickSizeInner);

      text
          .attr(x, k * spacing)
          .text(format);

      selection.filter(entering)
          .attr("fill", "none")
          .attr("font-size", 10)
          .attr("font-family", "sans-serif")
          .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

      selection
          .each(function() { this.__axis = position; });
    }

    axis.scale = function(_) {
      return arguments.length ? (scale = _, axis) : scale;
    };

    axis.ticks = function() {
      return tickArguments = Array.from(arguments), axis;
    };

    axis.tickArguments = function(_) {
      return arguments.length ? (tickArguments = _ == null ? [] : Array.from(_), axis) : tickArguments.slice();
    };

    axis.tickValues = function(_) {
      return arguments.length ? (tickValues = _ == null ? null : Array.from(_), axis) : tickValues && tickValues.slice();
    };

    axis.tickFormat = function(_) {
      return arguments.length ? (tickFormat = _, axis) : tickFormat;
    };

    axis.tickSize = function(_) {
      return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
    };

    axis.tickSizeInner = function(_) {
      return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
    };

    axis.tickSizeOuter = function(_) {
      return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
    };

    axis.tickPadding = function(_) {
      return arguments.length ? (tickPadding = +_, axis) : tickPadding;
    };

    axis.offset = function(_) {
      return arguments.length ? (offset = +_, axis) : offset;
    };

    return axis;
  }

  function axisBottom(scale) {
    return axis(bottom, scale);
  }

  function axisLeft(scale) {
    return axis(left, scale);
  }

  var noop$2 = {value: () => {}};

  function dispatch$1() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch$1(_);
  }

  function Dispatch$1(_) {
    this._ = _;
  }

  function parseTypenames$3(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {type: t, name: name};
    });
  }

  Dispatch$1.prototype = dispatch$1.prototype = {
    constructor: Dispatch$1,
    on: function(typename, callback) {
      var _ = this._,
          T = parseTypenames$3(typename + "", _),
          t,
          i = -1,
          n = T.length;

      // If no callback was specified, return the callback of the given type and name.
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get$3(_[t], typename.name))) return t;
        return;
      }

      // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set$2(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set$2(_[t], typename.name, null);
      }

      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch$1(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };

  function get$3(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set$2(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop$2, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  var xhtml$1 = "http://www.w3.org/1999/xhtml";

  var namespaces$1 = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml$1,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace$1(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces$1.hasOwnProperty(prefix) ? {space: namespaces$1[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
  }

  function creatorInherit$1(name) {
    return function() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml$1 && document.documentElement.namespaceURI === xhtml$1
          ? document.createElement(name)
          : document.createElementNS(uri, name);
    };
  }

  function creatorFixed$1(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator$1(name) {
    var fullname = namespace$1(name);
    return (fullname.local
        ? creatorFixed$1
        : creatorInherit$1)(fullname);
  }

  function none$1() {}

  function selector$1(selector) {
    return selector == null ? none$1 : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select$1(select) {
    if (typeof select !== "function") select = selector$1(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection$2(subgroups, this._parents);
  }

  // Given something array like (or null), returns something that is strictly an
  // array. This is used to ensure that array-like objects passed to d3.selectAll
  // or selection.selectAll are converted into proper arrays when creating a
  // selection; we don’t ever want to create a selection backed by a live
  // HTMLCollection or NodeList. However, note that selection.selectAll will use a
  // static NodeList as a group, since it safely derived from querySelectorAll.
  function array$1(x) {
    return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
  }

  function empty$1() {
    return [];
  }

  function selectorAll$1(selector) {
    return selector == null ? empty$1 : function() {
      return this.querySelectorAll(selector);
    };
  }

  function arrayAll(select) {
    return function() {
      return array$1(select.apply(this, arguments));
    };
  }

  function selection_selectAll$1(select) {
    if (typeof select === "function") select = arrayAll(select);
    else select = selectorAll$1(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection$2(subgroups, parents);
  }

  function matcher$1(selector) {
    return function() {
      return this.matches(selector);
    };
  }

  function childMatcher(selector) {
    return function(node) {
      return node.matches(selector);
    };
  }

  var find = Array.prototype.find;

  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }

  function childFirst() {
    return this.firstElementChild;
  }

  function selection_selectChild(match) {
    return this.select(match == null ? childFirst
        : childFind(typeof match === "function" ? match : childMatcher(match)));
  }

  var filter = Array.prototype.filter;

  function children() {
    return Array.from(this.children);
  }

  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }

  function selection_selectChildren(match) {
    return this.selectAll(match == null ? children
        : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }

  function selection_filter$1(match) {
    if (typeof match !== "function") match = matcher$1(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection$2(subgroups, this._parents);
  }

  function sparse$1(update) {
    return new Array(update.length);
  }

  function selection_enter$1() {
    return new Selection$2(this._enter || this._groups.map(sparse$1), this._parents);
  }

  function EnterNode$1(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode$1.prototype = {
    constructor: EnterNode$1,
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
    querySelector: function(selector) { return this._parent.querySelector(selector); },
    querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
  };

  function constant$5(x) {
    return function() {
      return x;
    };
  }

  function bindIndex$1(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length;

    // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode$1(parent, data[i]);
      }
    }

    // Put any non-null nodes that don’t fit into exit.
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey$1(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = new Map,
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue;

    // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }

    // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.
    for (i = 0; i < dataLength; ++i) {
      keyValue = key.call(parent, data[i], i, data) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i] = new EnterNode$1(parent, data[i]);
      }
    }

    // Add any remaining nodes that were not bound to data to exit.
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
        exit[i] = node;
      }
    }
  }

  function datum(node) {
    return node.__data__;
  }

  function selection_data$1(value, key) {
    if (!arguments.length) return Array.from(this, datum);

    var bind = key ? bindKey$1 : bindIndex$1,
        parents = this._parents,
        groups = this._groups;

    if (typeof value !== "function") value = constant$5(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = arraylike(value.call(parent, parent && parent.__data__, j, parents)),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);

      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

      // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength);
          previous._next = next || null;
        }
      }
    }

    update = new Selection$2(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  // Given some data, this returns an array-like view of it: an object that
  // exposes a length property and allows numeric indexing. Note that unlike
  // selectAll, this isn’t worried about “live” collections because the resulting
  // array will only be used briefly while data is being bound. (It is possible to
  // cause the data to change while iterating by using a key function, but please
  // don’t; we’d rather avoid a gratuitous copy.)
  function arraylike(data) {
    return typeof data === "object" && "length" in data
      ? data // Array, TypedArray, NodeList, array-like
      : Array.from(data); // Map, Set, iterable, string, or anything else
  }

  function selection_exit$1() {
    return new Selection$2(this._exit || this._groups.map(sparse$1), this._parents);
  }

  function selection_join$1(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    if (typeof onenter === "function") {
      enter = onenter(enter);
      if (enter) enter = enter.selection();
    } else {
      enter = enter.append(onenter + "");
    }
    if (onupdate != null) {
      update = onupdate(update);
      if (update) update = update.selection();
    }
    if (onexit == null) exit.remove(); else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge$1(context) {
    var selection = context.selection ? context.selection() : context;

    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection$2(merges, this._parents);
  }

  function selection_order$1() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort$1(compare) {
    if (!compare) compare = ascending$1;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }

    return new Selection$2(sortgroups, this._parents).order();
  }

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call$1() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes$1() {
    return Array.from(this);
  }

  function selection_node$1() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size$1() {
    let size = 0;
    for (const node of this) ++size; // eslint-disable-line no-unused-vars
    return size;
  }

  function selection_empty$1() {
    return !this.node();
  }

  function selection_each$1(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove$2(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS$2(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant$2(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS$2(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction$2(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS$2(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr$1(name, value) {
    var fullname = namespace$1(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local
          ? node.getAttributeNS(fullname.space, fullname.local)
          : node.getAttribute(fullname);
    }

    return this.each((value == null
        ? (fullname.local ? attrRemoveNS$2 : attrRemove$2) : (typeof value === "function"
        ? (fullname.local ? attrFunctionNS$2 : attrFunction$2)
        : (fullname.local ? attrConstantNS$2 : attrConstant$2)))(fullname, value));
  }

  function defaultView$1(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

  function styleRemove$2(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant$2(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction$2(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style$1(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove$2 : typeof value === "function"
              ? styleFunction$2
              : styleConstant$2)(name, value, priority == null ? "" : priority))
        : styleValue$1(this.node(), name);
  }

  function styleValue$1(node, name) {
    return node.style.getPropertyValue(name)
        || defaultView$1(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove$1(name) {
    return function() {
      delete this[name];
    };
  }

  function propertyConstant$1(name, value) {
    return function() {
      this[name] = value;
    };
  }

  function propertyFunction$1(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }

  function selection_property$1(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove$1 : typeof value === "function"
            ? propertyFunction$1
            : propertyConstant$1)(name, value))
        : this.node()[name];
  }

  function classArray$1(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList$1(node) {
    return node.classList || new ClassList$1(node);
  }

  function ClassList$1(node) {
    this._node = node;
    this._names = classArray$1(node.getAttribute("class") || "");
  }

  ClassList$1.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd$1(node, names) {
    var list = classList$1(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }

  function classedRemove$1(node, names) {
    var list = classList$1(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }

  function classedTrue$1(names) {
    return function() {
      classedAdd$1(this, names);
    };
  }

  function classedFalse$1(names) {
    return function() {
      classedRemove$1(this, names);
    };
  }

  function classedFunction$1(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd$1 : classedRemove$1)(this, names);
    };
  }

  function selection_classed$1(name, value) {
    var names = classArray$1(name + "");

    if (arguments.length < 2) {
      var list = classList$1(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }

    return this.each((typeof value === "function"
        ? classedFunction$1 : value
        ? classedTrue$1
        : classedFalse$1)(names, value));
  }

  function textRemove$1() {
    this.textContent = "";
  }

  function textConstant$2(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction$2(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text$1(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove$1 : (typeof value === "function"
            ? textFunction$2
            : textConstant$2)(value))
        : this.node().textContent;
  }

  function htmlRemove$1() {
    this.innerHTML = "";
  }

  function htmlConstant$1(value) {
    return function() {
      this.innerHTML = value;
    };
  }

  function htmlFunction$1(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html$1(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove$1 : (typeof value === "function"
            ? htmlFunction$1
            : htmlConstant$1)(value))
        : this.node().innerHTML;
  }

  function raise$1() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise$1() {
    return this.each(raise$1);
  }

  function lower$1() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower$1() {
    return this.each(lower$1);
  }

  function selection_append$1(name) {
    var create = typeof name === "function" ? name : creator$1(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull$1() {
    return null;
  }

  function selection_insert$1(name, before) {
    var create = typeof name === "function" ? name : creator$1(name),
        select = before == null ? constantNull$1 : typeof before === "function" ? before : selector$1(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove$1() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove$1() {
    return this.each(remove$1);
  }

  function selection_cloneShallow$1() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_cloneDeep$1() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_clone$1(deep) {
    return this.select(deep ? selection_cloneDeep$1 : selection_cloneShallow$1);
  }

  function selection_datum$1(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

  function contextListener$1(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }

  function parseTypenames$2(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {type: t, name: name};
    });
  }

  function onRemove$1(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }

  function onAdd$1(typename, value, options) {
    return function() {
      var on = this.__on, o, listener = contextListener$1(value);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
          this.addEventListener(o.type, o.listener = listener, o.options = options);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, options);
      o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }

  function selection_on$1(typename, value, options) {
    var typenames = parseTypenames$2(typename + ""), i, n = typenames.length, t;

    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd$1 : onRemove$1;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
    return this;
  }

  function dispatchEvent$1(node, type, params) {
    var window = defaultView$1(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant$1(type, params) {
    return function() {
      return dispatchEvent$1(this, type, params);
    };
  }

  function dispatchFunction$1(type, params) {
    return function() {
      return dispatchEvent$1(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch$1(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction$1
        : dispatchConstant$1)(type, params));
  }

  function* selection_iterator() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) yield node;
      }
    }
  }

  var root$1 = [null];

  function Selection$2(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  function selection() {
    return new Selection$2([[document.documentElement]], root$1);
  }

  function selection_selection() {
    return this;
  }

  Selection$2.prototype = selection.prototype = {
    constructor: Selection$2,
    select: selection_select$1,
    selectAll: selection_selectAll$1,
    selectChild: selection_selectChild,
    selectChildren: selection_selectChildren,
    filter: selection_filter$1,
    data: selection_data$1,
    enter: selection_enter$1,
    exit: selection_exit$1,
    join: selection_join$1,
    merge: selection_merge$1,
    selection: selection_selection,
    order: selection_order$1,
    sort: selection_sort$1,
    call: selection_call$1,
    nodes: selection_nodes$1,
    node: selection_node$1,
    size: selection_size$1,
    empty: selection_empty$1,
    each: selection_each$1,
    attr: selection_attr$1,
    style: selection_style$1,
    property: selection_property$1,
    classed: selection_classed$1,
    text: selection_text$1,
    html: selection_html$1,
    raise: selection_raise$1,
    lower: selection_lower$1,
    append: selection_append$1,
    insert: selection_insert$1,
    remove: selection_remove$1,
    clone: selection_clone$1,
    datum: selection_datum$1,
    on: selection_on$1,
    dispatch: selection_dispatch$1,
    [Symbol.iterator]: selection_iterator
  };

  function select$1(selector) {
    return typeof selector === "string"
        ? new Selection$2([[document.querySelector(selector)]], [document.documentElement])
        : new Selection$2([[selector]], root$1);
  }

  function selectAll(selector) {
    return typeof selector === "string"
        ? new Selection$2([document.querySelectorAll(selector)], [document.documentElement])
        : new Selection$2([array$1(selector)], root$1);
  }

  function define(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }

  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  function Color() {}

  var darker = 0.7;
  var brighter = 1 / darker;

  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex = /^#([0-9a-f]{3,8})$/,
      reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
      reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
      reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
      reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
      reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
      reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

  var named = {
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgreen: 0x006400,
    darkgrey: 0xa9a9a9,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    grey: 0x808080,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightgrey: 0xd3d3d3,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32
  };

  define(Color, color, {
    copy(channels) {
      return Object.assign(new this.constructor, this, channels);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: color_formatHex, // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHex8: color_formatHex8,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });

  function color_formatHex() {
    return this.rgb().formatHex();
  }

  function color_formatHex8() {
    return this.rgb().formatHex8();
  }

  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }

  function color_formatRgb() {
    return this.rgb().formatRgb();
  }

  function color(format) {
    var m, l;
    format = (format + "").trim().toLowerCase();
    return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
        : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
        : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
        : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
        : null) // invalid hex
        : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
        : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
        : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
        : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
        : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
        : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
        : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
        : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
        : null;
  }

  function rgbn(n) {
    return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
  }

  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }

  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb;
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }

  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }

  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Rgb, rgb, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
    },
    displayable() {
      return (-0.5 <= this.r && this.r < 255.5)
          && (-0.5 <= this.g && this.g < 255.5)
          && (-0.5 <= this.b && this.b < 255.5)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex, // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatHex8: rgb_formatHex8,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));

  function rgb_formatHex() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
  }

  function rgb_formatHex8() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }

  function rgb_formatRgb() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
  }

  function clampa(opacity) {
    return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
  }

  function clampi(value) {
    return Math.max(0, Math.min(255, Math.round(value) || 0));
  }

  function hex(value) {
    value = clampi(value);
    return (value < 16 ? "0" : "") + value.toString(16);
  }

  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }

  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl;
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        h = NaN,
        s = max - min,
        l = (max + min) / 2;
    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;
      else if (g === max) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }

  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }

  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Hsl, hsl, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < 0.5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    clamp() {
      return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s))
          && (0 <= this.l && this.l <= 1)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
    }
  }));

  function clamph(value) {
    value = (value || 0) % 360;
    return value < 0 ? value + 360 : value;
  }

  function clampt(value) {
    return Math.max(0, Math.min(1, value || 0));
  }

  /* From FvD 13.37, CSS Color Module Level 3 */
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60
        : h < 180 ? m2
        : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
        : m1) * 255;
  }

  var constant$4 = x => () => x;

  function linear$1(a, d) {
    return function(t) {
      return a + t * d;
    };
  }

  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }

  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant$4(isNaN(a) ? b : a);
    };
  }

  function nogamma(a, b) {
    var d = b - a;
    return d ? linear$1(a, d) : constant$4(isNaN(a) ? b : a);
  }

  var interpolateRgb = (function rgbGamma(y) {
    var color = gamma(y);

    function rgb$1(start, end) {
      var r = color((start = rgb(start)).r, (end = rgb(end)).r),
          g = color(start.g, end.g),
          b = color(start.b, end.b),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.r = r(t);
        start.g = g(t);
        start.b = b(t);
        start.opacity = opacity(t);
        return start + "";
      };
    }

    rgb$1.gamma = rgbGamma;

    return rgb$1;
  })(1);

  function numberArray(a, b) {
    if (!b) b = [];
    var n = a ? Math.min(b.length, a.length) : 0,
        c = b.slice(),
        i;
    return function(t) {
      for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
      return c;
    };
  }

  function isNumberArray(x) {
    return ArrayBuffer.isView(x) && !(x instanceof DataView);
  }

  function genericArray(a, b) {
    var nb = b ? b.length : 0,
        na = a ? Math.min(nb, a.length) : 0,
        x = new Array(na),
        c = new Array(nb),
        i;

    for (i = 0; i < na; ++i) x[i] = interpolate$1(a[i], b[i]);
    for (; i < nb; ++i) c[i] = b[i];

    return function(t) {
      for (i = 0; i < na; ++i) c[i] = x[i](t);
      return c;
    };
  }

  function date(a, b) {
    var d = new Date;
    return a = +a, b = +b, function(t) {
      return d.setTime(a * (1 - t) + b * t), d;
    };
  }

  function interpolateNumber(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  function object(a, b) {
    var i = {},
        c = {},
        k;

    if (a === null || typeof a !== "object") a = {};
    if (b === null || typeof b !== "object") b = {};

    for (k in b) {
      if (k in a) {
        i[k] = interpolate$1(a[k], b[k]);
      } else {
        c[k] = b[k];
      }
    }

    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

  function zero(b) {
    return function() {
      return b;
    };
  }

  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }

  function interpolateString(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
        am, // current match in a
        bm, // current match in b
        bs, // string preceding current number in b, if any
        i = -1, // index in s
        s = [], // string constants and placeholders
        q = []; // number interpolators

    // Coerce inputs to strings.
    a = a + "", b = b + "";

    // Interpolate pairs of numbers in a & b.
    while ((am = reA.exec(a))
        && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) { // a string precedes the next number in b
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
        if (s[i]) s[i] += bm; // coalesce with previous string
        else s[++i] = bm;
      } else { // interpolate non-matching numbers
        s[++i] = null;
        q.push({i: i, x: interpolateNumber(am, bm)});
      }
      bi = reB.lastIndex;
    }

    // Add remains of b.
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }

    // Special optimization for only a single match.
    // Otherwise, interpolate each of the numbers and rejoin the string.
    return s.length < 2 ? (q[0]
        ? one(q[0].x)
        : zero(b))
        : (b = q.length, function(t) {
            for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
            return s.join("");
          });
  }

  function interpolate$1(a, b) {
    var t = typeof b, c;
    return b == null || t === "boolean" ? constant$4(b)
        : (t === "number" ? interpolateNumber
        : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
        : b instanceof color ? interpolateRgb
        : b instanceof Date ? date
        : isNumberArray(b) ? numberArray
        : Array.isArray(b) ? genericArray
        : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
        : interpolateNumber)(a, b);
  }

  function interpolateRound(a, b) {
    return a = +a, b = +b, function(t) {
      return Math.round(a * (1 - t) + b * t);
    };
  }

  var degrees = 180 / Math.PI;

  var identity$2 = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };

  function decompose(a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX: scaleX,
      scaleY: scaleY
    };
  }

  var svgNode;

  /* eslint-disable no-undef */
  function parseCss(value) {
    const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
    return m.isIdentity ? identity$2 : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
  }

  function parseSvg(value) {
    if (value == null) return identity$2;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity$2;
    value = value.matrix;
    return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  function interpolateTransform(parse, pxComma, pxParen, degParen) {

    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }

    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }

    function rotate(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
        q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }

    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }

    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }

    return function(a, b) {
      var s = [], // string constants and placeholders
          q = []; // number interpolators
      a = parse(a), b = parse(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null; // gc
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n) s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }

  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  var frame = 0, // is an animation frame pending?
      timeout$1 = 0, // is a timeout pending?
      interval = 0, // are any timers active?
      pokeDelay = 1000, // how frequently we check for clock skew
      taskHead,
      taskTail,
      clockLast = 0,
      clockNow = 0,
      clockSkew = 0,
      clock = typeof performance === "object" && performance.now ? performance : Date,
      setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }

  function clearNow() {
    clockNow = 0;
  }

  function Timer() {
    this._call =
    this._time =
    this._next = null;
  }

  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };

  function timer(callback, delay, time) {
    var t = new Timer;
    t.restart(callback, delay, time);
    return t;
  }

  function timerFlush() {
    now(); // Get the current time, if not already set.
    ++frame; // Pretend we’ve set an alarm, if we haven’t already.
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(undefined, e);
      t = t._next;
    }
    --frame;
  }

  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout$1 = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }

  function poke() {
    var now = clock.now(), delay = now - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
  }

  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }

  function sleep(time) {
    if (frame) return; // Soonest alarm already set, or will be.
    if (timeout$1) timeout$1 = clearTimeout(timeout$1);
    var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
    if (delay > 24) {
      if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  function timeout(callback, delay, time) {
    var t = new Timer;
    delay = delay == null ? 0 : +delay;
    t.restart(elapsed => {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  var emptyOn = dispatch$1("start", "end", "cancel", "interrupt");
  var emptyTween = [];

  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;

  function schedule(node, name, id, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id in schedules) return;
    create(node, id, {
      name: name,
      index: index, // For context during callback.
      group: group, // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }

  function init(node, id) {
    var schedule = get$2(node, id);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }

  function set$1(node, id) {
    var schedule = get$2(node, id);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }

  function get$2(node, id) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
    return schedule;
  }

  function create(node, id, self) {
    var schedules = node.__transition,
        tween;

    // Initialize the self timer when the transition is created.
    // Note the actual delay is not known until the first callback!
    schedules[id] = self;
    self.timer = timer(schedule, 0, self.time);

    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start, self.delay, self.time);

      // If the elapsed delay is less than our first sleep, start immediately.
      if (self.delay <= elapsed) start(elapsed - self.delay);
    }

    function start(elapsed) {
      var i, j, n, o;

      // If the state is not SCHEDULED, then we previously errored on start.
      if (self.state !== SCHEDULED) return stop();

      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self.name) continue;

        // While this element already has a starting transition during this frame,
        // defer starting an interrupting transition until that transition has a
        // chance to tick (and possibly end); see d3/d3-transition#54!
        if (o.state === STARTED) return timeout(start);

        // Interrupt the active transition, if any.
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }

        // Cancel any pre-empted transitions.
        else if (+i < id) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }

      // Defer the first tick to end of the current frame; see d3/d3#1576.
      // Note the transition may be canceled after start and before the first tick!
      // Note this must be scheduled before the start event; see d3/d3-transition#16!
      // Assuming this is successful, subsequent callbacks go straight to tick.
      timeout(function() {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      });

      // Dispatch the start event.
      // Note this must be done before the tween are initialized.
      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING) return; // interrupted
      self.state = STARTED;

      // Initialize the tween, deleting null tween.
      tween = new Array(n = self.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }

    function tick(elapsed) {
      var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
          i = -1,
          n = tween.length;

      while (++i < n) {
        tween[i].call(node, t);
      }

      // Dispatch the end event.
      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }

    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id];
      for (var i in schedules) return; // eslint-disable-line no-unused-vars
      delete node.__transition;
    }
  }

  function interrupt(node, name) {
    var schedules = node.__transition,
        schedule,
        active,
        empty = true,
        i;

    if (!schedules) return;

    name = name == null ? null : name + "";

    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }

    if (empty) delete node.__transition;
  }

  function selection_interrupt(name) {
    return this.each(function() {
      interrupt(this, name);
    });
  }

  function tweenRemove(id, name) {
    var tween0, tween1;
    return function() {
      var schedule = set$1(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }

      schedule.tween = tween1;
    };
  }

  function tweenFunction(id, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error;
    return function() {
      var schedule = set$1(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n) tween1.push(t);
      }

      schedule.tween = tween1;
    };
  }

  function transition_tween(name, value) {
    var id = this._id;

    name += "";

    if (arguments.length < 2) {
      var tween = get$2(this.node(), id).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }
      return null;
    }

    return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
  }

  function tweenValue(transition, name, value) {
    var id = transition._id;

    transition.each(function() {
      var schedule = set$1(this, id);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });

    return function(node) {
      return get$2(node, id).value[name];
    };
  }

  function interpolate(a, b) {
    var c;
    return (typeof b === "number" ? interpolateNumber
        : b instanceof color ? interpolateRgb
        : (c = color(b)) ? (b = c, interpolateRgb)
        : interpolateString)(a, b);
  }

  function attrRemove$1(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS$1(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrConstantNS$1(fullname, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function attrFunctionNS$1(fullname, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function transition_attr(name, value) {
    var fullname = namespace$1(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
    return this.attrTween(name, typeof value === "function"
        ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
        : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
        : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
  }

  function attrInterpolate(name, i) {
    return function(t) {
      this.setAttribute(name, i.call(this, t));
    };
  }

  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }

  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function transition_attrTween(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    var fullname = namespace$1(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  function delayFunction(id, value) {
    return function() {
      init(this, id).delay = +value.apply(this, arguments);
    };
  }

  function delayConstant(id, value) {
    return value = +value, function() {
      init(this, id).delay = value;
    };
  }

  function transition_delay(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? delayFunction
            : delayConstant)(id, value))
        : get$2(this.node(), id).delay;
  }

  function durationFunction(id, value) {
    return function() {
      set$1(this, id).duration = +value.apply(this, arguments);
    };
  }

  function durationConstant(id, value) {
    return value = +value, function() {
      set$1(this, id).duration = value;
    };
  }

  function transition_duration(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? durationFunction
            : durationConstant)(id, value))
        : get$2(this.node(), id).duration;
  }

  function easeConstant(id, value) {
    if (typeof value !== "function") throw new Error;
    return function() {
      set$1(this, id).ease = value;
    };
  }

  function transition_ease(value) {
    var id = this._id;

    return arguments.length
        ? this.each(easeConstant(id, value))
        : get$2(this.node(), id).ease;
  }

  function easeVarying(id, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (typeof v !== "function") throw new Error;
      set$1(this, id).ease = v;
    };
  }

  function transition_easeVarying(value) {
    if (typeof value !== "function") throw new Error;
    return this.each(easeVarying(this._id, value));
  }

  function transition_filter(match) {
    if (typeof match !== "function") match = matcher$1(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  function transition_merge(transition) {
    if (transition._id !== this._id) throw new Error;

    for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Transition(merges, this._parents, this._name, this._id);
  }

  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }

  function onFunction(id, name, listener) {
    var on0, on1, sit = start(name) ? init : set$1;
    return function() {
      var schedule = sit(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

      schedule.on = on1;
    };
  }

  function transition_on(name, listener) {
    var id = this._id;

    return arguments.length < 2
        ? get$2(this.node(), id).on.on(name)
        : this.each(onFunction(id, name, listener));
  }

  function removeFunction(id) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id) return;
      if (parent) parent.removeChild(this);
    };
  }

  function transition_remove() {
    return this.on("end.remove", removeFunction(this._id));
  }

  function transition_select(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selector$1(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule(subgroup[i], name, id, i, subgroup, get$2(node, id));
        }
      }
    }

    return new Transition(subgroups, this._parents, name, id);
  }

  function transition_selectAll(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selectorAll$1(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children = select.call(node, node.__data__, i, group), child, inherit = get$2(node, id), k = 0, l = children.length; k < l; ++k) {
            if (child = children[k]) {
              schedule(child, name, id, k, children, inherit);
            }
          }
          subgroups.push(children);
          parents.push(node);
        }
      }
    }

    return new Transition(subgroups, parents, name, id);
  }

  var Selection$1 = selection.prototype.constructor;

  function transition_selection() {
    return new Selection$1(this._groups, this._parents);
  }

  function styleNull(name, interpolate) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue$1(this, name),
          string1 = (this.style.removeProperty(name), styleValue$1(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }

  function styleRemove$1(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = styleValue$1(this, name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function styleFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue$1(this, name),
          value1 = value(this),
          string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue$1(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function styleMaybeRemove(id, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
    return function() {
      var schedule = set$1(this, id),
          on = schedule.on,
          listener = schedule.value[key] == null ? remove || (remove = styleRemove$1(name)) : undefined;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

      schedule.on = on1;
    };
  }

  function transition_style(name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
    return value == null ? this
        .styleTween(name, styleNull(name, i))
        .on("end.style." + name, styleRemove$1(name))
      : typeof value === "function" ? this
        .styleTween(name, styleFunction$1(name, i, tweenValue(this, "style." + name, value)))
        .each(styleMaybeRemove(this._id, name))
      : this
        .styleTween(name, styleConstant$1(name, i, value), priority)
        .on("end.style." + name, null);
  }

  function styleInterpolate(name, i, priority) {
    return function(t) {
      this.style.setProperty(name, i.call(this, t), priority);
    };
  }

  function styleTween(name, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }

  function transition_styleTween(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  function textConstant$1(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction$1(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }

  function transition_text(value) {
    return this.tween("text", typeof value === "function"
        ? textFunction$1(tweenValue(this, "text", value))
        : textConstant$1(value == null ? "" : value + ""));
  }

  function textInterpolate(i) {
    return function(t) {
      this.textContent = i.call(this, t);
    };
  }

  function textTween(value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function transition_textTween(value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, textTween(value));
  }

  function transition_transition() {
    var name = this._name,
        id0 = this._id,
        id1 = newId();

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit = get$2(node, id0);
          schedule(node, name, id1, i, group, {
            time: inherit.time + inherit.delay + inherit.duration,
            delay: 0,
            duration: inherit.duration,
            ease: inherit.ease
          });
        }
      }
    }

    return new Transition(groups, this._parents, name, id1);
  }

  function transition_end() {
    var on0, on1, that = this, id = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = {value: reject},
          end = {value: function() { if (--size === 0) resolve(); }};

      that.each(function() {
        var schedule = set$1(this, id),
            on = schedule.on;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }

        schedule.on = on1;
      });

      // The selection was empty, resolve end immediately
      if (size === 0) resolve();
    });
  }

  var id = 0;

  function Transition(groups, parents, name, id) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id;
  }

  function newId() {
    return ++id;
  }

  var selection_prototype = selection.prototype;

  Transition.prototype = {
    constructor: Transition,
    select: transition_select,
    selectAll: transition_selectAll,
    selectChild: selection_prototype.selectChild,
    selectChildren: selection_prototype.selectChildren,
    filter: transition_filter,
    merge: transition_merge,
    selection: transition_selection,
    transition: transition_transition,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: transition_on,
    attr: transition_attr,
    attrTween: transition_attrTween,
    style: transition_style,
    styleTween: transition_styleTween,
    text: transition_text,
    textTween: transition_textTween,
    remove: transition_remove,
    tween: transition_tween,
    delay: transition_delay,
    duration: transition_duration,
    ease: transition_ease,
    easeVarying: transition_easeVarying,
    end: transition_end,
    [Symbol.iterator]: selection_prototype[Symbol.iterator]
  };

  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  var defaultTiming = {
    time: null, // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };

  function inherit(node, id) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id])) {
      if (!(node = node.parentNode)) {
        throw new Error(`transition ${id} not found`);
      }
    }
    return timing;
  }

  function selection_transition(name) {
    var id,
        timing;

    if (name instanceof Transition) {
      id = name._id, name = name._name;
    } else {
      id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule(node, name, id, i, group, timing || inherit(node, id));
        }
      }
    }

    return new Transition(groups, this._parents, name, id);
  }

  selection.prototype.interrupt = selection_interrupt;
  selection.prototype.transition = selection_transition;

  const pi$2 = Math.PI,
      tau$2 = 2 * pi$2,
      epsilon$2 = 1e-6,
      tauEpsilon$1 = tau$2 - epsilon$2;

  function append(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length; i < n; ++i) {
      this._ += arguments[i] + strings[i];
    }
  }

  function appendRound(digits) {
    let d = Math.floor(digits);
    if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
    if (d > 15) return append;
    const k = 10 ** d;
    return function(strings) {
      this._ += strings[0];
      for (let i = 1, n = strings.length; i < n; ++i) {
        this._ += Math.round(arguments[i] * k) / k + strings[i];
      }
    };
  }

  let Path$1 = class Path {
    constructor(digits) {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null; // end of current subpath
      this._ = "";
      this._append = digits == null ? append : appendRound(digits);
    }
    moveTo(x, y) {
      this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
    }
    closePath() {
      if (this._x1 !== null) {
        this._x1 = this._x0, this._y1 = this._y0;
        this._append`Z`;
      }
    }
    lineTo(x, y) {
      this._append`L${this._x1 = +x},${this._y1 = +y}`;
    }
    quadraticCurveTo(x1, y1, x, y) {
      this._append`Q${+x1},${+y1},${this._x1 = +x},${this._y1 = +y}`;
    }
    bezierCurveTo(x1, y1, x2, y2, x, y) {
      this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x},${this._y1 = +y}`;
    }
    arcTo(x1, y1, x2, y2, r) {
      x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;

      // Is the radius negative? Error.
      if (r < 0) throw new Error(`negative radius: ${r}`);

      let x0 = this._x1,
          y0 = this._y1,
          x21 = x2 - x1,
          y21 = y2 - y1,
          x01 = x0 - x1,
          y01 = y0 - y1,
          l01_2 = x01 * x01 + y01 * y01;

      // Is this path empty? Move to (x1,y1).
      if (this._x1 === null) {
        this._append`M${this._x1 = x1},${this._y1 = y1}`;
      }

      // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
      else if (!(l01_2 > epsilon$2));

      // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
      // Equivalently, is (x1,y1) coincident with (x2,y2)?
      // Or, is the radius zero? Line to (x1,y1).
      else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon$2) || !r) {
        this._append`L${this._x1 = x1},${this._y1 = y1}`;
      }

      // Otherwise, draw an arc!
      else {
        let x20 = x2 - x0,
            y20 = y2 - y0,
            l21_2 = x21 * x21 + y21 * y21,
            l20_2 = x20 * x20 + y20 * y20,
            l21 = Math.sqrt(l21_2),
            l01 = Math.sqrt(l01_2),
            l = r * Math.tan((pi$2 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
            t01 = l / l01,
            t21 = l / l21;

        // If the start tangent is not coincident with (x0,y0), line to.
        if (Math.abs(t01 - 1) > epsilon$2) {
          this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
        }

        this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
      }
    }
    arc(x, y, r, a0, a1, ccw) {
      x = +x, y = +y, r = +r, ccw = !!ccw;

      // Is the radius negative? Error.
      if (r < 0) throw new Error(`negative radius: ${r}`);

      let dx = r * Math.cos(a0),
          dy = r * Math.sin(a0),
          x0 = x + dx,
          y0 = y + dy,
          cw = 1 ^ ccw,
          da = ccw ? a0 - a1 : a1 - a0;

      // Is this path empty? Move to (x0,y0).
      if (this._x1 === null) {
        this._append`M${x0},${y0}`;
      }

      // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
      else if (Math.abs(this._x1 - x0) > epsilon$2 || Math.abs(this._y1 - y0) > epsilon$2) {
        this._append`L${x0},${y0}`;
      }

      // Is this arc empty? We’re done.
      if (!r) return;

      // Does the angle go the wrong way? Flip the direction.
      if (da < 0) da = da % tau$2 + tau$2;

      // Is this a complete circle? Draw two arcs to complete the circle.
      if (da > tauEpsilon$1) {
        this._append`A${r},${r},0,1,${cw},${x - dx},${y - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
      }

      // Is this arc non-empty? Draw an arc!
      else if (da > epsilon$2) {
        this._append`A${r},${r},0,${+(da >= pi$2)},${cw},${this._x1 = x + r * Math.cos(a1)},${this._y1 = y + r * Math.sin(a1)}`;
      }
    }
    rect(x, y, w, h) {
      this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${w = +w}v${+h}h${-w}Z`;
    }
    toString() {
      return this._;
    }
  };

  var EOL = {},
      EOF = {},
      QUOTE = 34,
      NEWLINE = 10,
      RETURN = 13;

  function objectConverter(columns) {
    return new Function("d", "return {" + columns.map(function(name, i) {
      return JSON.stringify(name) + ": d[" + i + "] || \"\"";
    }).join(",") + "}");
  }

  function customConverter(columns, f) {
    var object = objectConverter(columns);
    return function(row, i) {
      return f(object(row), i, columns);
    };
  }

  // Compute unique columns in order of discovery.
  function inferColumns(rows) {
    var columnSet = Object.create(null),
        columns = [];

    rows.forEach(function(row) {
      for (var column in row) {
        if (!(column in columnSet)) {
          columns.push(columnSet[column] = column);
        }
      }
    });

    return columns;
  }

  function pad(value, width) {
    var s = value + "", length = s.length;
    return length < width ? new Array(width - length + 1).join(0) + s : s;
  }

  function formatYear(year) {
    return year < 0 ? "-" + pad(-year, 6)
      : year > 9999 ? "+" + pad(year, 6)
      : pad(year, 4);
  }

  function formatDate(date) {
    var hours = date.getUTCHours(),
        minutes = date.getUTCMinutes(),
        seconds = date.getUTCSeconds(),
        milliseconds = date.getUTCMilliseconds();
    return isNaN(date) ? "Invalid Date"
        : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2)
        + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z"
        : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z"
        : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z"
        : "");
  }

  function dsvFormat(delimiter) {
    var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
        DELIMITER = delimiter.charCodeAt(0);

    function parse(text, f) {
      var convert, columns, rows = parseRows(text, function(row, i) {
        if (convert) return convert(row, i - 1);
        columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
      });
      rows.columns = columns || [];
      return rows;
    }

    function parseRows(text, f) {
      var rows = [], // output rows
          N = text.length,
          I = 0, // current character index
          n = 0, // current line number
          t, // current token
          eof = N <= 0, // current token followed by EOF?
          eol = false; // current token followed by EOL?

      // Strip the trailing newline.
      if (text.charCodeAt(N - 1) === NEWLINE) --N;
      if (text.charCodeAt(N - 1) === RETURN) --N;

      function token() {
        if (eof) return EOF;
        if (eol) return eol = false, EOL;

        // Unescape quotes.
        var i, j = I, c;
        if (text.charCodeAt(j) === QUOTE) {
          while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
          if ((i = I) >= N) eof = true;
          else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
          else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
          return text.slice(j + 1, i - 1).replace(/""/g, "\"");
        }

        // Find next delimiter or newline.
        while (I < N) {
          if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
          else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
          else if (c !== DELIMITER) continue;
          return text.slice(j, i);
        }

        // Return last token before EOF.
        return eof = true, text.slice(j, N);
      }

      while ((t = token()) !== EOF) {
        var row = [];
        while (t !== EOL && t !== EOF) row.push(t), t = token();
        if (f && (row = f(row, n++)) == null) continue;
        rows.push(row);
      }

      return rows;
    }

    function preformatBody(rows, columns) {
      return rows.map(function(row) {
        return columns.map(function(column) {
          return formatValue(row[column]);
        }).join(delimiter);
      });
    }

    function format(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
    }

    function formatBody(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return preformatBody(rows, columns).join("\n");
    }

    function formatRows(rows) {
      return rows.map(formatRow).join("\n");
    }

    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }

    function formatValue(value) {
      return value == null ? ""
          : value instanceof Date ? formatDate(value)
          : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
          : value;
    }

    return {
      parse: parse,
      parseRows: parseRows,
      format: format,
      formatBody: formatBody,
      formatRows: formatRows,
      formatRow: formatRow,
      formatValue: formatValue
    };
  }

  var csv$1 = dsvFormat(",");

  var csvParse = csv$1.parse;

  function responseText(response) {
    if (!response.ok) throw new Error(response.status + " " + response.statusText);
    return response.text();
  }

  function text(input, init) {
    return fetch(input, init).then(responseText);
  }

  function dsvParse(parse) {
    return function(input, init, row) {
      if (arguments.length === 2 && typeof init === "function") row = init, init = undefined;
      return text(input, init).then(function(response) {
        return parse(response, row);
      });
    };
  }

  var csv = dsvParse(csvParse);

  function formatDecimal(x) {
    return Math.abs(x = Math.round(x)) >= 1e21
        ? x.toLocaleString("en").replace(/,/g, "")
        : x.toString(10);
  }

  // Computes the decimal coefficient and exponent of the specified number x with
  // significant digits p, where x is positive and p is in [1, 21] or undefined.
  // For example, formatDecimalParts(1.23) returns ["123", 0].
  function formatDecimalParts(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
    return function(value, width) {
      var i = value.length,
          t = [],
          j = 0,
          g = grouping[0],
          length = 0;

      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }

      return t.reverse().join(thousands);
    };
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }

  formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
    this.align = specifier.align === undefined ? ">" : specifier.align + "";
    this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === undefined ? undefined : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === undefined ? "" : specifier.type + "";
  }

  FormatSpecifier.prototype.toString = function() {
    return this.fill
        + this.align
        + this.sign
        + this.symbol
        + (this.zero ? "0" : "")
        + (this.width === undefined ? "" : Math.max(1, this.width | 0))
        + (this.comma ? "," : "")
        + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
        + (this.trim ? "~" : "")
        + this.type;
  };

  // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
  function formatTrim(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".": i0 = i1 = i; break;
        case "0": if (i0 === 0) i0 = i; i1 = i; break;
        default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1],
        i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
        n = coefficient.length;
    return i === n ? coefficient
        : i > n ? coefficient + new Array(i - n + 1).join("0")
        : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
        : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
  }

  function formatRounded(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  var formatTypes = {
    "%": (x, p) => (x * 100).toFixed(p),
    "b": (x) => Math.round(x).toString(2),
    "c": (x) => x + "",
    "d": formatDecimal,
    "e": (x, p) => x.toExponential(p),
    "f": (x, p) => x.toFixed(p),
    "g": (x, p) => x.toPrecision(p),
    "o": (x) => Math.round(x).toString(8),
    "p": (x, p) => formatRounded(x * 100, p),
    "r": formatRounded,
    "s": formatPrefixAuto,
    "X": (x) => Math.round(x).toString(16).toUpperCase(),
    "x": (x) => Math.round(x).toString(16)
  };

  function identity$1(x) {
    return x;
  }

  var map = Array.prototype.map,
      prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
        currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
        currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
        decimal = locale.decimal === undefined ? "." : locale.decimal + "",
        numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
        percent = locale.percent === undefined ? "%" : locale.percent + "",
        minus = locale.minus === undefined ? "−" : locale.minus + "",
        nan = locale.nan === undefined ? "NaN" : locale.nan + "";

    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);

      var fill = specifier.fill,
          align = specifier.align,
          sign = specifier.sign,
          symbol = specifier.symbol,
          zero = specifier.zero,
          width = specifier.width,
          comma = specifier.comma,
          precision = specifier.precision,
          trim = specifier.trim,
          type = specifier.type;

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // The "" type, and any invalid type, is an alias for ".12~g".
      else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      // Compute the prefix and suffix.
      // For SI-prefix, the suffix is lazily computed.
      var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
          suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

      // What format function should we use?
      // Is this an integer type?
      // Can this type generate exponential notation?
      var formatType = formatTypes[type],
          maybeSuffix = /[defgprs%]/.test(type);

      // Set the default precision if not specified,
      // or clamp the specified precision to the supported range.
      // For significant precision, it must be in [1, 21].
      // For fixed precision, it must be in [0, 20].
      precision = precision === undefined ? 6
          : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
          : Math.max(0, Math.min(20, precision));

      function format(value) {
        var valuePrefix = prefix,
            valueSuffix = suffix,
            i, n, c;

        if (type === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;

          // Determine the sign. -0 is not less than 0, but 1 / -0 is!
          var valueNegative = value < 0 || 1 / value < 0;

          // Perform the initial formatting.
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

          // Trim insignificant zeros.
          if (trim) value = formatTrim(value);

          // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
          if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

          // Compute the prefix and suffix.
          valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
          valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

          // Break the formatted value into the integer “value” part that can be
          // grouped, and fractional or exponential “suffix” part that is not.
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }

        // If the fill character is not "0", grouping is applied before padding.
        if (comma && !zero) value = group(value, Infinity);

        // Compute the padding.
        var length = valuePrefix.length + value.length + valueSuffix.length,
            padding = length < width ? new Array(width - length + 1).join(fill) : "";

        // If the fill character is "0", grouping is applied after padding.
        if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

        // Reconstruct the final output based on the desired alignment.
        switch (align) {
          case "<": value = valuePrefix + value + valueSuffix + padding; break;
          case "=": value = valuePrefix + padding + value + valueSuffix; break;
          case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
          default: value = padding + valuePrefix + value + valueSuffix; break;
        }

        return numerals(value);
      }

      format.toString = function() {
        return specifier + "";
      };

      return format;
    }

    function formatPrefix(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
          e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
          k = Math.pow(10, -e),
          prefix = prefixes[8 + e / 3];
      return function(value) {
        return f(k * value) + prefix;
      };
    }

    return {
      format: newFormat,
      formatPrefix: formatPrefix
    };
  }

  var locale;
  var format;
  var formatPrefix;

  defaultLocale({
    thousands: ",",
    grouping: [3],
    currency: ["$", ""]
  });

  function defaultLocale(definition) {
    locale = formatLocale(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  function precisionFixed(step) {
    return Math.max(0, -exponent(Math.abs(step)));
  }

  function precisionPrefix(step, value) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
  }

  function precisionRound(step, max) {
    step = Math.abs(step), max = Math.abs(max) - step;
    return Math.max(0, exponent(max) - exponent(step)) + 1;
  }

  function initRange(domain, range) {
    switch (arguments.length) {
      case 0: break;
      case 1: this.range(domain); break;
      default: this.range(range).domain(domain); break;
    }
    return this;
  }

  const implicit = Symbol("implicit");

  function ordinal() {
    var index = new InternMap(),
        domain = [],
        range = [],
        unknown = implicit;

    function scale(d) {
      let i = index.get(d);
      if (i === undefined) {
        if (unknown !== implicit) return unknown;
        index.set(d, i = domain.push(d) - 1);
      }
      return range[i % range.length];
    }

    scale.domain = function(_) {
      if (!arguments.length) return domain.slice();
      domain = [], index = new InternMap();
      for (const value of _) {
        if (index.has(value)) continue;
        index.set(value, domain.push(value) - 1);
      }
      return scale;
    };

    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), scale) : range.slice();
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    scale.copy = function() {
      return ordinal(domain, range).unknown(unknown);
    };

    initRange.apply(scale, arguments);

    return scale;
  }

  function constants(x) {
    return function() {
      return x;
    };
  }

  function number(x) {
    return +x;
  }

  var unit = [0, 1];

  function identity(x) {
    return x;
  }

  function normalize(a, b) {
    return (b -= (a = +a))
        ? function(x) { return (x - a) / b; }
        : constants(isNaN(b) ? NaN : 0.5);
  }

  function clamper(a, b) {
    var t;
    if (a > b) t = a, a = b, b = t;
    return function(x) { return Math.max(a, Math.min(b, x)); };
  }

  // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
  // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
  function bimap(domain, range, interpolate) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
    else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
    return function(x) { return r0(d0(x)); };
  }

  function polymap(domain, range, interpolate) {
    var j = Math.min(domain.length, range.length) - 1,
        d = new Array(j),
        r = new Array(j),
        i = -1;

    // Reverse descending domains.
    if (domain[j] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }

    while (++i < j) {
      d[i] = normalize(domain[i], domain[i + 1]);
      r[i] = interpolate(range[i], range[i + 1]);
    }

    return function(x) {
      var i = bisectRight(domain, x, 1, j) - 1;
      return r[i](d[i](x));
    };
  }

  function copy(source, target) {
    return target
        .domain(source.domain())
        .range(source.range())
        .interpolate(source.interpolate())
        .clamp(source.clamp())
        .unknown(source.unknown());
  }

  function transformer() {
    var domain = unit,
        range = unit,
        interpolate = interpolate$1,
        transform,
        untransform,
        unknown,
        clamp = identity,
        piecewise,
        output,
        input;

    function rescale() {
      var n = Math.min(domain.length, range.length);
      if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
      piecewise = n > 2 ? polymap : bimap;
      output = input = null;
      return scale;
    }

    function scale(x) {
      return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
    }

    scale.invert = function(y) {
      return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
    };

    scale.domain = function(_) {
      return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
    };

    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
    };

    scale.rangeRound = function(_) {
      return range = Array.from(_), interpolate = interpolateRound, rescale();
    };

    scale.clamp = function(_) {
      return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
    };

    scale.interpolate = function(_) {
      return arguments.length ? (interpolate = _, rescale()) : interpolate;
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    return function(t, u) {
      transform = t, untransform = u;
      return rescale();
    };
  }

  function continuous() {
    return transformer()(identity, identity);
  }

  function tickFormat(start, stop, count, specifier) {
    var step = tickStep(start, stop, count),
        precision;
    specifier = formatSpecifier(specifier == null ? ",f" : specifier);
    switch (specifier.type) {
      case "s": {
        var value = Math.max(Math.abs(start), Math.abs(stop));
        if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
        return formatPrefix(specifier, value);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
        break;
      }
      case "f":
      case "%": {
        if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
        break;
      }
    }
    return format(specifier);
  }

  function linearish(scale) {
    var domain = scale.domain;

    scale.ticks = function(count) {
      var d = domain();
      return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
    };

    scale.tickFormat = function(count, specifier) {
      var d = domain();
      return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
    };

    scale.nice = function(count) {
      if (count == null) count = 10;

      var d = domain();
      var i0 = 0;
      var i1 = d.length - 1;
      var start = d[i0];
      var stop = d[i1];
      var prestep;
      var step;
      var maxIter = 10;

      if (stop < start) {
        step = start, start = stop, stop = step;
        step = i0, i0 = i1, i1 = step;
      }
      
      while (maxIter-- > 0) {
        step = tickIncrement(start, stop, count);
        if (step === prestep) {
          d[i0] = start;
          d[i1] = stop;
          return domain(d);
        } else if (step > 0) {
          start = Math.floor(start / step) * step;
          stop = Math.ceil(stop / step) * step;
        } else if (step < 0) {
          start = Math.ceil(start * step) / step;
          stop = Math.floor(stop * step) / step;
        } else {
          break;
        }
        prestep = step;
      }

      return scale;
    };

    return scale;
  }

  function linear() {
    var scale = continuous();

    scale.copy = function() {
      return copy(scale, linear());
    };

    initRange.apply(scale, arguments);

    return linearish(scale);
  }

  function transformPow(exponent) {
    return function(x) {
      return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
    };
  }

  function transformSqrt(x) {
    return x < 0 ? -Math.sqrt(-x) : Math.sqrt(x);
  }

  function transformSquare(x) {
    return x < 0 ? -x * x : x * x;
  }

  function powish(transform) {
    var scale = transform(identity, identity),
        exponent = 1;

    function rescale() {
      return exponent === 1 ? transform(identity, identity)
          : exponent === 0.5 ? transform(transformSqrt, transformSquare)
          : transform(transformPow(exponent), transformPow(1 / exponent));
    }

    scale.exponent = function(_) {
      return arguments.length ? (exponent = +_, rescale()) : exponent;
    };

    return linearish(scale);
  }

  function pow() {
    var scale = powish(transformer());

    scale.copy = function() {
      return copy(scale, pow()).exponent(scale.exponent());
    };

    initRange.apply(scale, arguments);

    return scale;
  }

  function colors$1(specifier) {
    var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
    while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
    return colors;
  }

  var category10 = colors$1("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

  var Set3 = colors$1("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f");

  function constant$3(x) {
    return function constant() {
      return x;
    };
  }

  function withPath(shape) {
    let digits = 3;

    shape.digits = function(_) {
      if (!arguments.length) return digits;
      if (_ == null) {
        digits = null;
      } else {
        const d = Math.floor(_);
        if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
        digits = d;
      }
      return shape;
    };

    return () => new Path$1(digits);
  }

  function array(x) {
    return typeof x === "object" && "length" in x
      ? x // Array, TypedArray, NodeList, array-like
      : Array.from(x); // Map, Set, iterable, string, or anything else
  }

  function Linear$1(context) {
    this._context = context;
  }

  Linear$1.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; // falls through
        default: this._context.lineTo(x, y); break;
      }
    }
  };

  function curveLinear$1(context) {
    return new Linear$1(context);
  }

  function x$1(p) {
    return p[0];
  }

  function y$1(p) {
    return p[1];
  }

  function line$1(x, y) {
    var defined = constant$3(true),
        context = null,
        curve = curveLinear$1,
        output = null,
        path = withPath(line);

    x = typeof x === "function" ? x : (x === undefined) ? x$1 : constant$3(x);
    y = typeof y === "function" ? y : (y === undefined) ? y$1 : constant$3(y);

    function line(data) {
      var i,
          n = (data = array(data)).length,
          d,
          defined0 = false,
          buffer;

      if (context == null) output = curve(buffer = path());

      for (i = 0; i <= n; ++i) {
        if (!(i < n && defined(d = data[i], i, data)) === defined0) {
          if (defined0 = !defined0) output.lineStart();
          else output.lineEnd();
        }
        if (defined0) output.point(+x(d, i, data), +y(d, i, data));
      }

      if (buffer) return output = null, buffer + "" || null;
    }

    line.x = function(_) {
      return arguments.length ? (x = typeof _ === "function" ? _ : constant$3(+_), line) : x;
    };

    line.y = function(_) {
      return arguments.length ? (y = typeof _ === "function" ? _ : constant$3(+_), line) : y;
    };

    line.defined = function(_) {
      return arguments.length ? (defined = typeof _ === "function" ? _ : constant$3(!!_), line) : defined;
    };

    line.curve = function(_) {
      return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
    };

    line.context = function(_) {
      return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
    };

    return line;
  }

  function sign$1(x) {
    return x < 0 ? -1 : 1;
  }

  // Calculate the slopes of the tangents (Hermite-type interpolation) based on
  // the following paper: Steffen, M. 1990. A Simple Method for Monotonic
  // Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
  // NOV(II), P. 443, 1990.
  function slope3$1(that, x2, y2) {
    var h0 = that._x1 - that._x0,
        h1 = x2 - that._x1,
        s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
        s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
        p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign$1(s0) + sign$1(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }

  // Calculate a one-sided slope.
  function slope2$1(that, t) {
    var h = that._x1 - that._x0;
    return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
  }

  // According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
  // "you can express cubic Hermite interpolation in terms of cubic Bézier curves
  // with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
  function point$5(that, t0, t1) {
    var x0 = that._x0,
        y0 = that._y0,
        x1 = that._x1,
        y1 = that._y1,
        dx = (x1 - x0) / 3;
    that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
  }

  function MonotoneX$1(context) {
    this._context = context;
  }

  MonotoneX$1.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 =
      this._y0 = this._y1 =
      this._t0 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 2: this._context.lineTo(this._x1, this._y1); break;
        case 3: point$5(this, this._t0, slope2$1(this, this._t0)); break;
      }
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      var t1 = NaN;

      x = +x, y = +y;
      if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; point$5(this, slope2$1(this, t1 = slope3$1(this, x, y)), t1); break;
        default: point$5(this, this._t0, t1 = slope3$1(this, x, y)); break;
      }

      this._x0 = this._x1, this._x1 = x;
      this._y0 = this._y1, this._y1 = y;
      this._t0 = t1;
    }
  };

  (Object.create(MonotoneX$1.prototype)).point = function(x, y) {
    MonotoneX$1.prototype.point.call(this, y, x);
  };

  function monotoneX(context) {
    return new MonotoneX$1(context);
  }

  function Transform(k, x, y) {
    this.k = k;
    this.x = x;
    this.y = y;
  }

  Transform.prototype = {
    constructor: Transform,
    scale: function(k) {
      return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
    },
    translate: function(x, y) {
      return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
    },
    apply: function(point) {
      return [point[0] * this.k + this.x, point[1] * this.k + this.y];
    },
    applyX: function(x) {
      return x * this.k + this.x;
    },
    applyY: function(y) {
      return y * this.k + this.y;
    },
    invert: function(location) {
      return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
    },
    invertX: function(x) {
      return (x - this.x) / this.k;
    },
    invertY: function(y) {
      return (y - this.y) / this.k;
    },
    rescaleX: function(x) {
      return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
    },
    rescaleY: function(y) {
      return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
    },
    toString: function() {
      return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
    }
  };

  Transform.prototype;

  var xhtml = "http://www.w3.org/1999/xhtml";

  var namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
  }

  function creatorInherit(name) {
    return function() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml && document.documentElement.namespaceURI === xhtml
          ? document.createElement(name)
          : document.createElementNS(uri, name);
    };
  }

  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local
        ? creatorFixed
        : creatorInherit)(fullname);
  }

  function none() {}

  function selector(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select(select) {
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function empty() {
    return [];
  }

  function selectorAll(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  function selection_selectAll(select) {
    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection(subgroups, parents);
  }

  function matcher(selector) {
    return function() {
      return this.matches(selector);
    };
  }

  function selection_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse(update) {
    return new Array(update.length);
  }

  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }

  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
    querySelector: function(selector) { return this._parent.querySelector(selector); },
    querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
  };

  function constant$2(x) {
    return function() {
      return x;
    };
  }

  var keyPrefix = "$"; // Protect against keys like “__proto__”.

  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length;

    // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Put any non-null nodes that don’t fit into exit.
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = {},
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue;

    // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
        if (keyValue in nodeByKeyValue) {
          exit[i] = node;
        } else {
          nodeByKeyValue[keyValue] = node;
        }
      }
    }

    // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.
    for (i = 0; i < dataLength; ++i) {
      keyValue = keyPrefix + key.call(parent, data[i], i, data);
      if (node = nodeByKeyValue[keyValue]) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue[keyValue] = null;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Add any remaining nodes that were not bound to data to exit.
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
        exit[i] = node;
      }
    }
  }

  function selection_data(value, key) {
    if (!value) {
      data = new Array(this.size()), j = -1;
      this.each(function(d) { data[++j] = d; });
      return data;
    }

    var bind = key ? bindKey : bindIndex,
        parents = this._parents,
        groups = this._groups;

    if (typeof value !== "function") value = constant$2(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = value.call(parent, parent && parent.__data__, j, parents),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);

      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

      // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength);
          previous._next = next || null;
        }
      }
    }

    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_join(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
    if (onupdate != null) update = onupdate(update);
    if (onexit == null) exit.remove(); else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge(selection) {

    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection(merges, this._parents);
  }

  function selection_order() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort(compare) {
    if (!compare) compare = ascending;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }

    return new Selection(sortgroups, this._parents).order();
  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes() {
    var nodes = new Array(this.size()), i = -1;
    this.each(function() { nodes[++i] = this; });
    return nodes;
  }

  function selection_node() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size() {
    var size = 0;
    this.each(function() { ++size; });
    return size;
  }

  function selection_empty() {
    return !this.node();
  }

  function selection_each(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr(name, value) {
    var fullname = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local
          ? node.getAttributeNS(fullname.space, fullname.local)
          : node.getAttribute(fullname);
    }

    return this.each((value == null
        ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
        ? (fullname.local ? attrFunctionNS : attrFunction)
        : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
  }

  function defaultView(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove : typeof value === "function"
              ? styleFunction
              : styleConstant)(name, value, priority == null ? "" : priority))
        : styleValue(this.node(), name);
  }

  function styleValue(node, name) {
    return node.style.getPropertyValue(name)
        || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }

  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }

  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }

  function selection_property(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove : typeof value === "function"
            ? propertyFunction
            : propertyConstant)(name, value))
        : this.node()[name];
  }

  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList(node) {
    return node.classList || new ClassList(node);
  }

  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }

  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }

  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }

  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }

  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }

  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }

  function selection_classed(name, value) {
    var names = classArray(name + "");

    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }

    return this.each((typeof value === "function"
        ? classedFunction : value
        ? classedTrue
        : classedFalse)(names, value));
  }

  function textRemove() {
    this.textContent = "";
  }

  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove : (typeof value === "function"
            ? textFunction
            : textConstant)(value))
        : this.node().textContent;
  }

  function htmlRemove() {
    this.innerHTML = "";
  }

  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }

  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove : (typeof value === "function"
            ? htmlFunction
            : htmlConstant)(value))
        : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise() {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower() {
    return this.each(lower);
  }

  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove() {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
  }

  function selection_cloneDeep() {
    return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
  }

  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

  var filterEvents = {};

  var event = null;

  if (typeof document !== "undefined") {
    var element = document.documentElement;
    if (!("onmouseenter" in element)) {
      filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
    }
  }

  function filterContextListener(listener, index, group) {
    listener = contextListener(listener, index, group);
    return function(event) {
      var related = event.relatedTarget;
      if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
        listener.call(this, event);
      }
    };
  }

  function contextListener(listener, index, group) {
    return function(event1) {
      var event0 = event; // Events can be reentrant (e.g., focus).
      event = event1;
      try {
        listener.call(this, this.__data__, index, group);
      } finally {
        event = event0;
      }
    };
  }

  function parseTypenames$1(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {type: t, name: name};
    });
  }

  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }

  function onAdd(typename, value, capture) {
    var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
    return function(d, i, group) {
      var on = this.__on, o, listener = wrap(value, i, group);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
          this.addEventListener(o.type, o.listener = listener, o.capture = capture);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, capture);
      o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }

  function selection_on(typename, value, capture) {
    var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;

    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd : onRemove;
    if (capture == null) capture = false;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
    return this;
  }

  function customEvent(event1, listener, that, args) {
    var event0 = event;
    event1.sourceEvent = event;
    event = event1;
    try {
      return listener.apply(that, args);
    } finally {
      event = event0;
    }
  }

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }

  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction
        : dispatchConstant)(type, params));
  }

  var root = [null];

  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  Selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch
  };

  function select(selector) {
    return typeof selector === "string"
        ? new Selection([[document.querySelector(selector)]], [document.documentElement])
        : new Selection([[selector]], root);
  }

  var nextId = 0;

  function Local() {
    this._ = "@" + (++nextId).toString(36);
  }

  Local.prototype = {
    constructor: Local,
    get: function(node) {
      var id = this._;
      while (!(id in node)) if (!(node = node.parentNode)) return;
      return node[id];
    },
    set: function(node, value) {
      return node[this._] = value;
    },
    remove: function(node) {
      return this._ in node && delete node[this._];
    },
    toString: function() {
      return this._;
    }
  };

  function sourceEvent() {
    var current = event, source;
    while (source = current.sourceEvent) current = source;
    return current;
  }

  function point$4(node, event) {
    var svg = node.ownerSVGElement || node;

    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }

    var rect = node.getBoundingClientRect();
    return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
  }

  function mouse(node) {
    var event = sourceEvent();
    if (event.changedTouches) event = event.changedTouches[0];
    return point$4(node, event);
  }

  function touch(node, touches, identifier) {
    if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;

    for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
      if ((touch = touches[i]).identifier === identifier) {
        return point$4(node, touch);
      }
    }

    return null;
  }

  var noop$1 = {value: function() {}};

  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }

  function Dispatch(_) {
    this._ = _;
  }

  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {type: t, name: name};
    });
  }

  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._,
          T = parseTypenames(typename + "", _),
          t,
          i = -1,
          n = T.length;

      // If no callback was specified, return the callback of the given type and name.
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
        return;
      }

      // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }

      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };

  function get$1(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  function nopropagation() {
    event.stopImmediatePropagation();
  }

  function noevent() {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function nodrag(view) {
    var root = view.document.documentElement,
        selection = select(view).on("dragstart.drag", noevent, true);
    if ("onselectstart" in root) {
      selection.on("selectstart.drag", noevent, true);
    } else {
      root.__noselect = root.style.MozUserSelect;
      root.style.MozUserSelect = "none";
    }
  }

  function yesdrag(view, noclick) {
    var root = view.document.documentElement,
        selection = select(view).on("dragstart.drag", null);
    if (noclick) {
      selection.on("click.drag", noevent, true);
      setTimeout(function() { selection.on("click.drag", null); }, 0);
    }
    if ("onselectstart" in root) {
      selection.on("selectstart.drag", null);
    } else {
      root.style.MozUserSelect = root.__noselect;
      delete root.__noselect;
    }
  }

  function constant$1(x) {
    return function() {
      return x;
    };
  }

  function DragEvent(target, type, subject, id, active, x, y, dx, dy, dispatch) {
    this.target = target;
    this.type = type;
    this.subject = subject;
    this.identifier = id;
    this.active = active;
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this._ = dispatch;
  }

  DragEvent.prototype.on = function() {
    var value = this._.on.apply(this._, arguments);
    return value === this._ ? this : value;
  };

  // Ignore right-click, since that should open the context menu.
  function defaultFilter() {
    return !event.button;
  }

  function defaultContainer() {
    return this.parentNode;
  }

  function defaultSubject(d) {
    return d == null ? {x: event.x, y: event.y} : d;
  }

  function defaultTouchable() {
    return "ontouchstart" in this;
  }

  function drag() {
    var filter = defaultFilter,
        container = defaultContainer,
        subject = defaultSubject,
        touchable = defaultTouchable,
        gestures = {},
        listeners = dispatch("start", "drag", "end"),
        active = 0,
        mousedownx,
        mousedowny,
        mousemoving,
        touchending,
        clickDistance2 = 0;

    function drag(selection) {
      selection
          .on("mousedown.drag", mousedowned)
        .filter(touchable)
          .on("touchstart.drag", touchstarted)
          .on("touchmove.drag", touchmoved)
          .on("touchend.drag touchcancel.drag", touchended)
          .style("touch-action", "none")
          .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }

    function mousedowned() {
      if (touchending || !filter.apply(this, arguments)) return;
      var gesture = beforestart("mouse", container.apply(this, arguments), mouse, this, arguments);
      if (!gesture) return;
      select(event.view).on("mousemove.drag", mousemoved, true).on("mouseup.drag", mouseupped, true);
      nodrag(event.view);
      nopropagation();
      mousemoving = false;
      mousedownx = event.clientX;
      mousedowny = event.clientY;
      gesture("start");
    }

    function mousemoved() {
      noevent();
      if (!mousemoving) {
        var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
        mousemoving = dx * dx + dy * dy > clickDistance2;
      }
      gestures.mouse("drag");
    }

    function mouseupped() {
      select(event.view).on("mousemove.drag mouseup.drag", null);
      yesdrag(event.view, mousemoving);
      noevent();
      gestures.mouse("end");
    }

    function touchstarted() {
      if (!filter.apply(this, arguments)) return;
      var touches = event.changedTouches,
          c = container.apply(this, arguments),
          n = touches.length, i, gesture;

      for (i = 0; i < n; ++i) {
        if (gesture = beforestart(touches[i].identifier, c, touch, this, arguments)) {
          nopropagation();
          gesture("start");
        }
      }
    }

    function touchmoved() {
      var touches = event.changedTouches,
          n = touches.length, i, gesture;

      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          noevent();
          gesture("drag");
        }
      }
    }

    function touchended() {
      var touches = event.changedTouches,
          n = touches.length, i, gesture;

      if (touchending) clearTimeout(touchending);
      touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          nopropagation();
          gesture("end");
        }
      }
    }

    function beforestart(id, container, point, that, args) {
      var p = point(container, id), s, dx, dy,
          sublisteners = listeners.copy();

      if (!customEvent(new DragEvent(drag, "beforestart", s, id, active, p[0], p[1], 0, 0, sublisteners), function() {
        if ((event.subject = s = subject.apply(that, args)) == null) return false;
        dx = s.x - p[0] || 0;
        dy = s.y - p[1] || 0;
        return true;
      })) return;

      return function gesture(type) {
        var p0 = p, n;
        switch (type) {
          case "start": gestures[id] = gesture, n = active++; break;
          case "end": delete gestures[id], --active; // nobreak
          case "drag": p = point(container, id), n = active; break;
        }
        customEvent(new DragEvent(drag, type, s, id, n, p[0] + dx, p[1] + dy, p[0] - p0[0], p[1] - p0[1], sublisteners), sublisteners.apply, sublisteners, [type, that, args]);
      };
    }

    drag.filter = function(_) {
      return arguments.length ? (filter = typeof _ === "function" ? _ : constant$1(!!_), drag) : filter;
    };

    drag.container = function(_) {
      return arguments.length ? (container = typeof _ === "function" ? _ : constant$1(_), drag) : container;
    };

    drag.subject = function(_) {
      return arguments.length ? (subject = typeof _ === "function" ? _ : constant$1(_), drag) : subject;
    };

    drag.touchable = function(_) {
      return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$1(!!_), drag) : touchable;
    };

    drag.on = function() {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? drag : value;
    };

    drag.clickDistance = function(_) {
      return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
    };

    return drag;
  }

  var pi$1 = Math.PI,
      tau$1 = 2 * pi$1,
      epsilon$1 = 1e-6,
      tauEpsilon = tau$1 - epsilon$1;

  function Path() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath
    this._ = "";
  }

  function path() {
    return new Path;
  }

  Path.prototype = path.prototype = {
    constructor: Path,
    moveTo: function(x, y) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
    },
    closePath: function() {
      if (this._x1 !== null) {
        this._x1 = this._x0, this._y1 = this._y0;
        this._ += "Z";
      }
    },
    lineTo: function(x, y) {
      this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    quadraticCurveTo: function(x1, y1, x, y) {
      this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    bezierCurveTo: function(x1, y1, x2, y2, x, y) {
      this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    arcTo: function(x1, y1, x2, y2, r) {
      x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
      var x0 = this._x1,
          y0 = this._y1,
          x21 = x2 - x1,
          y21 = y2 - y1,
          x01 = x0 - x1,
          y01 = y0 - y1,
          l01_2 = x01 * x01 + y01 * y01;

      // Is the radius negative? Error.
      if (r < 0) throw new Error("negative radius: " + r);

      // Is this path empty? Move to (x1,y1).
      if (this._x1 === null) {
        this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
      }

      // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
      else if (!(l01_2 > epsilon$1));

      // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
      // Equivalently, is (x1,y1) coincident with (x2,y2)?
      // Or, is the radius zero? Line to (x1,y1).
      else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon$1) || !r) {
        this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
      }

      // Otherwise, draw an arc!
      else {
        var x20 = x2 - x0,
            y20 = y2 - y0,
            l21_2 = x21 * x21 + y21 * y21,
            l20_2 = x20 * x20 + y20 * y20,
            l21 = Math.sqrt(l21_2),
            l01 = Math.sqrt(l01_2),
            l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
            t01 = l / l01,
            t21 = l / l21;

        // If the start tangent is not coincident with (x0,y0), line to.
        if (Math.abs(t01 - 1) > epsilon$1) {
          this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
        }

        this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
      }
    },
    arc: function(x, y, r, a0, a1, ccw) {
      x = +x, y = +y, r = +r, ccw = !!ccw;
      var dx = r * Math.cos(a0),
          dy = r * Math.sin(a0),
          x0 = x + dx,
          y0 = y + dy,
          cw = 1 ^ ccw,
          da = ccw ? a0 - a1 : a1 - a0;

      // Is the radius negative? Error.
      if (r < 0) throw new Error("negative radius: " + r);

      // Is this path empty? Move to (x0,y0).
      if (this._x1 === null) {
        this._ += "M" + x0 + "," + y0;
      }

      // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
      else if (Math.abs(this._x1 - x0) > epsilon$1 || Math.abs(this._y1 - y0) > epsilon$1) {
        this._ += "L" + x0 + "," + y0;
      }

      // Is this arc empty? We’re done.
      if (!r) return;

      // Does the angle go the wrong way? Flip the direction.
      if (da < 0) da = da % tau$1 + tau$1;

      // Is this a complete circle? Draw two arcs to complete the circle.
      if (da > tauEpsilon) {
        this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
      }

      // Is this arc non-empty? Draw an arc!
      else if (da > epsilon$1) {
        this._ += "A" + r + "," + r + ",0," + (+(da >= pi$1)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
      }
    },
    rect: function(x, y, w, h) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
    },
    toString: function() {
      return this._;
    }
  };

  function constant(x) {
    return function constant() {
      return x;
    };
  }

  var epsilon = 1e-12;
  var pi = Math.PI;
  var halfPi = pi / 2;
  var tau = 2 * pi;

  function arcInnerRadius(d) {
    return d.innerRadius;
  }

  function arcOuterRadius(d) {
    return d.outerRadius;
  }

  function arcStartAngle(d) {
    return d.startAngle;
  }

  function arcEndAngle(d) {
    return d.endAngle;
  }

  function arcPadAngle(d) {
    return d && d.padAngle; // Note: optional!
  }

  function asin(x) {
    return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
  }

  function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
    var x10 = x1 - x0, y10 = y1 - y0,
        x32 = x3 - x2, y32 = y3 - y2,
        t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / (y32 * x10 - x32 * y10);
    return [x0 + t * x10, y0 + t * y10];
  }

  // Compute perpendicular offset line of length rc.
  // http://mathworld.wolfram.com/Circle-LineIntersection.html
  function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
    var x01 = x0 - x1,
        y01 = y0 - y1,
        lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01),
        ox = lo * y01,
        oy = -lo * x01,
        x11 = x0 + ox,
        y11 = y0 + oy,
        x10 = x1 + ox,
        y10 = y1 + oy,
        x00 = (x11 + x10) / 2,
        y00 = (y11 + y10) / 2,
        dx = x10 - x11,
        dy = y10 - y11,
        d2 = dx * dx + dy * dy,
        r = r1 - rc,
        D = x11 * y10 - x10 * y11,
        d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D)),
        cx0 = (D * dy - dx * d) / d2,
        cy0 = (-D * dx - dy * d) / d2,
        cx1 = (D * dy + dx * d) / d2,
        cy1 = (-D * dx + dy * d) / d2,
        dx0 = cx0 - x00,
        dy0 = cy0 - y00,
        dx1 = cx1 - x00,
        dy1 = cy1 - y00;

    // Pick the closer of the two intersection points.
    // TODO Is there a faster way to determine which intersection to use?
    if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

    return {
      cx: cx0,
      cy: cy0,
      x01: -ox,
      y01: -oy,
      x11: cx0 * (r1 / r - 1),
      y11: cy0 * (r1 / r - 1)
    };
  }

  function arc() {
    var innerRadius = arcInnerRadius,
        outerRadius = arcOuterRadius,
        cornerRadius = constant(0),
        padRadius = null,
        startAngle = arcStartAngle,
        endAngle = arcEndAngle,
        padAngle = arcPadAngle,
        context = null;

    function arc() {
      var buffer,
          r,
          r0 = +innerRadius.apply(this, arguments),
          r1 = +outerRadius.apply(this, arguments),
          a0 = startAngle.apply(this, arguments) - halfPi,
          a1 = endAngle.apply(this, arguments) - halfPi,
          da = Math.abs(a1 - a0),
          cw = a1 > a0;

      if (!context) context = buffer = path();

      // Ensure that the outer radius is always larger than the inner radius.
      if (r1 < r0) r = r1, r1 = r0, r0 = r;

      // Is it a point?
      if (!(r1 > epsilon)) context.moveTo(0, 0);

      // Or is it a circle or annulus?
      else if (da > tau - epsilon) {
        context.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
        context.arc(0, 0, r1, a0, a1, !cw);
        if (r0 > epsilon) {
          context.moveTo(r0 * Math.cos(a1), r0 * Math.sin(a1));
          context.arc(0, 0, r0, a1, a0, cw);
        }
      }

      // Or is it a circular or annular sector?
      else {
        var a01 = a0,
            a11 = a1,
            a00 = a0,
            a10 = a1,
            da0 = da,
            da1 = da,
            ap = padAngle.apply(this, arguments) / 2,
            rp = (ap > epsilon) && (padRadius ? +padRadius.apply(this, arguments) : Math.sqrt(r0 * r0 + r1 * r1)),
            rc = Math.min(Math.abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)),
            rc0 = rc,
            rc1 = rc,
            t0,
            t1;

        // Apply padding? Note that since r1 ≥ r0, da1 ≥ da0.
        if (rp > epsilon) {
          var p0 = asin(rp / r0 * Math.sin(ap)),
              p1 = asin(rp / r1 * Math.sin(ap));
          if ((da0 -= p0 * 2) > epsilon) p0 *= (cw ? 1 : -1), a00 += p0, a10 -= p0;
          else da0 = 0, a00 = a10 = (a0 + a1) / 2;
          if ((da1 -= p1 * 2) > epsilon) p1 *= (cw ? 1 : -1), a01 += p1, a11 -= p1;
          else da1 = 0, a01 = a11 = (a0 + a1) / 2;
        }

        var x01 = r1 * Math.cos(a01),
            y01 = r1 * Math.sin(a01),
            x10 = r0 * Math.cos(a10),
            y10 = r0 * Math.sin(a10);

        // Apply rounded corners?
        if (rc > epsilon) {
          var x11 = r1 * Math.cos(a11),
              y11 = r1 * Math.sin(a11),
              x00 = r0 * Math.cos(a00),
              y00 = r0 * Math.sin(a00);

          // Restrict the corner radius according to the sector angle.
          if (da < pi) {
            var oc = da0 > epsilon ? intersect(x01, y01, x00, y00, x11, y11, x10, y10) : [x10, y10],
                ax = x01 - oc[0],
                ay = y01 - oc[1],
                bx = x11 - oc[0],
                by = y11 - oc[1],
                kc = 1 / Math.sin(Math.acos((ax * bx + ay * by) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by))) / 2),
                lc = Math.sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
            rc0 = Math.min(rc, (r0 - lc) / (kc - 1));
            rc1 = Math.min(rc, (r1 - lc) / (kc + 1));
          }
        }

        // Is the sector collapsed to a line?
        if (!(da1 > epsilon)) context.moveTo(x01, y01);

        // Does the sector’s outer ring have rounded corners?
        else if (rc1 > epsilon) {
          t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
          t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);

          context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);

          // Have the corners merged?
          if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

          // Otherwise, draw the two corners and the ring.
          else {
            context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
            context.arc(0, 0, r1, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
            context.arc(t1.cx, t1.cy, rc1, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
          }
        }

        // Or is the outer ring just a circular arc?
        else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);

        // Is there no inner ring, and it’s a circular sector?
        // Or perhaps it’s an annular sector collapsed due to padding?
        if (!(r0 > epsilon) || !(da0 > epsilon)) context.lineTo(x10, y10);

        // Does the sector’s inner ring (or point) have rounded corners?
        else if (rc0 > epsilon) {
          t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
          t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);

          context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);

          // Have the corners merged?
          if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

          // Otherwise, draw the two corners and the ring.
          else {
            context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
            context.arc(0, 0, r0, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
            context.arc(t1.cx, t1.cy, rc0, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
          }
        }

        // Or is the inner ring just a circular arc?
        else context.arc(0, 0, r0, a10, a00, cw);
      }

      context.closePath();

      if (buffer) return context = null, buffer + "" || null;
    }

    arc.centroid = function() {
      var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
          a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi / 2;
      return [Math.cos(a) * r, Math.sin(a) * r];
    };

    arc.innerRadius = function(_) {
      return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant(+_), arc) : innerRadius;
    };

    arc.outerRadius = function(_) {
      return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant(+_), arc) : outerRadius;
    };

    arc.cornerRadius = function(_) {
      return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant(+_), arc) : cornerRadius;
    };

    arc.padRadius = function(_) {
      return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant(+_), arc) : padRadius;
    };

    arc.startAngle = function(_) {
      return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant(+_), arc) : startAngle;
    };

    arc.endAngle = function(_) {
      return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant(+_), arc) : endAngle;
    };

    arc.padAngle = function(_) {
      return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant(+_), arc) : padAngle;
    };

    arc.context = function(_) {
      return arguments.length ? ((context = _ == null ? null : _), arc) : context;
    };

    return arc;
  }

  function Linear(context) {
    this._context = context;
  }

  Linear.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; // proceed
        default: this._context.lineTo(x, y); break;
      }
    }
  };

  function curveLinear(context) {
    return new Linear(context);
  }

  function x(p) {
    return p[0];
  }

  function y(p) {
    return p[1];
  }

  function line() {
    var x$1 = x,
        y$1 = y,
        defined = constant(true),
        context = null,
        curve = curveLinear,
        output = null;

    function line(data) {
      var i,
          n = data.length,
          d,
          defined0 = false,
          buffer;

      if (context == null) output = curve(buffer = path());

      for (i = 0; i <= n; ++i) {
        if (!(i < n && defined(d = data[i], i, data)) === defined0) {
          if (defined0 = !defined0) output.lineStart();
          else output.lineEnd();
        }
        if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
      }

      if (buffer) return output = null, buffer + "" || null;
    }

    line.x = function(_) {
      return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant(+_), line) : x$1;
    };

    line.y = function(_) {
      return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant(+_), line) : y$1;
    };

    line.defined = function(_) {
      return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line) : defined;
    };

    line.curve = function(_) {
      return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
    };

    line.context = function(_) {
      return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
    };

    return line;
  }

  function noop() {}

  function point$3(that, x, y) {
    that._context.bezierCurveTo(
      (2 * that._x0 + that._x1) / 3,
      (2 * that._y0 + that._y1) / 3,
      (that._x0 + 2 * that._x1) / 3,
      (that._y0 + 2 * that._y1) / 3,
      (that._x0 + 4 * that._x1 + x) / 6,
      (that._y0 + 4 * that._y1 + y) / 6
    );
  }

  function Basis(context) {
    this._context = context;
  }

  Basis.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 =
      this._y0 = this._y1 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 3: point$3(this, this._x1, this._y1); // proceed
        case 2: this._context.lineTo(this._x1, this._y1); break;
      }
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); // proceed
        default: point$3(this, x, y); break;
      }
      this._x0 = this._x1, this._x1 = x;
      this._y0 = this._y1, this._y1 = y;
    }
  };

  function Bundle(context, beta) {
    this._basis = new Basis(context);
    this._beta = beta;
  }

  Bundle.prototype = {
    lineStart: function() {
      this._x = [];
      this._y = [];
      this._basis.lineStart();
    },
    lineEnd: function() {
      var x = this._x,
          y = this._y,
          j = x.length - 1;

      if (j > 0) {
        var x0 = x[0],
            y0 = y[0],
            dx = x[j] - x0,
            dy = y[j] - y0,
            i = -1,
            t;

        while (++i <= j) {
          t = i / j;
          this._basis.point(
            this._beta * x[i] + (1 - this._beta) * (x0 + t * dx),
            this._beta * y[i] + (1 - this._beta) * (y0 + t * dy)
          );
        }
      }

      this._x = this._y = null;
      this._basis.lineEnd();
    },
    point: function(x, y) {
      this._x.push(+x);
      this._y.push(+y);
    }
  };

  ((function custom(beta) {

    function bundle(context) {
      return beta === 1 ? new Basis(context) : new Bundle(context, beta);
    }

    bundle.beta = function(beta) {
      return custom(+beta);
    };

    return bundle;
  }))(0.85);

  function point$2(that, x, y) {
    that._context.bezierCurveTo(
      that._x1 + that._k * (that._x2 - that._x0),
      that._y1 + that._k * (that._y2 - that._y0),
      that._x2 + that._k * (that._x1 - x),
      that._y2 + that._k * (that._y1 - y),
      that._x2,
      that._y2
    );
  }

  function Cardinal(context, tension) {
    this._context = context;
    this._k = (1 - tension) / 6;
  }

  Cardinal.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 = this._x2 =
      this._y0 = this._y1 = this._y2 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 2: this._context.lineTo(this._x2, this._y2); break;
        case 3: point$2(this, this._x1, this._y1); break;
      }
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; this._x1 = x, this._y1 = y; break;
        case 2: this._point = 3; // proceed
        default: point$2(this, x, y); break;
      }
      this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
      this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
    }
  };

  ((function custom(tension) {

    function cardinal(context) {
      return new Cardinal(context, tension);
    }

    cardinal.tension = function(tension) {
      return custom(+tension);
    };

    return cardinal;
  }))(0);

  function CardinalClosed(context, tension) {
    this._context = context;
    this._k = (1 - tension) / 6;
  }

  CardinalClosed.prototype = {
    areaStart: noop,
    areaEnd: noop,
    lineStart: function() {
      this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
      this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 1: {
          this._context.moveTo(this._x3, this._y3);
          this._context.closePath();
          break;
        }
        case 2: {
          this._context.lineTo(this._x3, this._y3);
          this._context.closePath();
          break;
        }
        case 3: {
          this.point(this._x3, this._y3);
          this.point(this._x4, this._y4);
          this.point(this._x5, this._y5);
          break;
        }
      }
    },
    point: function(x, y) {
      x = +x, y = +y;
      switch (this._point) {
        case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
        case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
        case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
        default: point$2(this, x, y); break;
      }
      this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
      this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
    }
  };

  ((function custom(tension) {

    function cardinal(context) {
      return new CardinalClosed(context, tension);
    }

    cardinal.tension = function(tension) {
      return custom(+tension);
    };

    return cardinal;
  }))(0);

  function CardinalOpen(context, tension) {
    this._context = context;
    this._k = (1 - tension) / 6;
  }

  CardinalOpen.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 = this._x2 =
      this._y0 = this._y1 = this._y2 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;
      switch (this._point) {
        case 0: this._point = 1; break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
        case 3: this._point = 4; // proceed
        default: point$2(this, x, y); break;
      }
      this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
      this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
    }
  };

  ((function custom(tension) {

    function cardinal(context) {
      return new CardinalOpen(context, tension);
    }

    cardinal.tension = function(tension) {
      return custom(+tension);
    };

    return cardinal;
  }))(0);

  function point$1(that, x, y) {
    var x1 = that._x1,
        y1 = that._y1,
        x2 = that._x2,
        y2 = that._y2;

    if (that._l01_a > epsilon) {
      var a = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a,
          n = 3 * that._l01_a * (that._l01_a + that._l12_a);
      x1 = (x1 * a - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
      y1 = (y1 * a - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
    }

    if (that._l23_a > epsilon) {
      var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a,
          m = 3 * that._l23_a * (that._l23_a + that._l12_a);
      x2 = (x2 * b + that._x1 * that._l23_2a - x * that._l12_2a) / m;
      y2 = (y2 * b + that._y1 * that._l23_2a - y * that._l12_2a) / m;
    }

    that._context.bezierCurveTo(x1, y1, x2, y2, that._x2, that._y2);
  }

  function CatmullRom(context, alpha) {
    this._context = context;
    this._alpha = alpha;
  }

  CatmullRom.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 = this._x2 =
      this._y0 = this._y1 = this._y2 = NaN;
      this._l01_a = this._l12_a = this._l23_a =
      this._l01_2a = this._l12_2a = this._l23_2a =
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 2: this._context.lineTo(this._x2, this._y2); break;
        case 3: this.point(this._x2, this._y2); break;
      }
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;

      if (this._point) {
        var x23 = this._x2 - x,
            y23 = this._y2 - y;
        this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
      }

      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; // proceed
        default: point$1(this, x, y); break;
      }

      this._l01_a = this._l12_a, this._l12_a = this._l23_a;
      this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
      this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
      this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
    }
  };

  var curveCatmullRom = (function custom(alpha) {

    function catmullRom(context) {
      return alpha ? new CatmullRom(context, alpha) : new Cardinal(context, 0);
    }

    catmullRom.alpha = function(alpha) {
      return custom(+alpha);
    };

    return catmullRom;
  })(0.5);

  function CatmullRomClosed(context, alpha) {
    this._context = context;
    this._alpha = alpha;
  }

  CatmullRomClosed.prototype = {
    areaStart: noop,
    areaEnd: noop,
    lineStart: function() {
      this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
      this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
      this._l01_a = this._l12_a = this._l23_a =
      this._l01_2a = this._l12_2a = this._l23_2a =
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 1: {
          this._context.moveTo(this._x3, this._y3);
          this._context.closePath();
          break;
        }
        case 2: {
          this._context.lineTo(this._x3, this._y3);
          this._context.closePath();
          break;
        }
        case 3: {
          this.point(this._x3, this._y3);
          this.point(this._x4, this._y4);
          this.point(this._x5, this._y5);
          break;
        }
      }
    },
    point: function(x, y) {
      x = +x, y = +y;

      if (this._point) {
        var x23 = this._x2 - x,
            y23 = this._y2 - y;
        this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
      }

      switch (this._point) {
        case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
        case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
        case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
        default: point$1(this, x, y); break;
      }

      this._l01_a = this._l12_a, this._l12_a = this._l23_a;
      this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
      this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
      this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
    }
  };

  ((function custom(alpha) {

    function catmullRom(context) {
      return alpha ? new CatmullRomClosed(context, alpha) : new CardinalClosed(context, 0);
    }

    catmullRom.alpha = function(alpha) {
      return custom(+alpha);
    };

    return catmullRom;
  }))(0.5);

  function CatmullRomOpen(context, alpha) {
    this._context = context;
    this._alpha = alpha;
  }

  CatmullRomOpen.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 = this._x2 =
      this._y0 = this._y1 = this._y2 = NaN;
      this._l01_a = this._l12_a = this._l23_a =
      this._l01_2a = this._l12_2a = this._l23_2a =
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;

      if (this._point) {
        var x23 = this._x2 - x,
            y23 = this._y2 - y;
        this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
      }

      switch (this._point) {
        case 0: this._point = 1; break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
        case 3: this._point = 4; // proceed
        default: point$1(this, x, y); break;
      }

      this._l01_a = this._l12_a, this._l12_a = this._l23_a;
      this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
      this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
      this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
    }
  };

  ((function custom(alpha) {

    function catmullRom(context) {
      return alpha ? new CatmullRomOpen(context, alpha) : new CardinalOpen(context, 0);
    }

    catmullRom.alpha = function(alpha) {
      return custom(+alpha);
    };

    return catmullRom;
  }))(0.5);

  function sign(x) {
    return x < 0 ? -1 : 1;
  }

  // Calculate the slopes of the tangents (Hermite-type interpolation) based on
  // the following paper: Steffen, M. 1990. A Simple Method for Monotonic
  // Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
  // NOV(II), P. 443, 1990.
  function slope3(that, x2, y2) {
    var h0 = that._x1 - that._x0,
        h1 = x2 - that._x1,
        s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
        s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
        p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }

  // Calculate a one-sided slope.
  function slope2(that, t) {
    var h = that._x1 - that._x0;
    return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
  }

  // According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
  // "you can express cubic Hermite interpolation in terms of cubic Bézier curves
  // with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
  function point(that, t0, t1) {
    var x0 = that._x0,
        y0 = that._y0,
        x1 = that._x1,
        y1 = that._y1,
        dx = (x1 - x0) / 3;
    that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
  }

  function MonotoneX(context) {
    this._context = context;
  }

  MonotoneX.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 =
      this._y0 = this._y1 =
      this._t0 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 2: this._context.lineTo(this._x1, this._y1); break;
        case 3: point(this, this._t0, slope2(this, this._t0)); break;
      }
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      var t1 = NaN;

      x = +x, y = +y;
      if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; point(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
        default: point(this, this._t0, t1 = slope3(this, x, y)); break;
      }

      this._x0 = this._x1, this._x1 = x;
      this._y0 = this._y1, this._y1 = y;
      this._t0 = t1;
    }
  };

  (Object.create(MonotoneX.prototype)).point = function(x, y) {
    MonotoneX.prototype.point.call(this, y, x);
  };

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };











  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();







  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  var get = function get(object, property, receiver) {
    if (object === null) object = Function.prototype;
    var desc = Object.getOwnPropertyDescriptor(object, property);

    if (desc === undefined) {
      var parent = Object.getPrototypeOf(object);

      if (parent === null) {
        return undefined;
      } else {
        return get(parent, property, receiver);
      }
    } else if ("value" in desc) {
      return desc.value;
    } else {
      var getter = desc.get;

      if (getter === undefined) {
        return undefined;
      }

      return getter.call(receiver);
    }
  };

  var inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };











  var possibleConstructorReturn = function (self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  };



















  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  (function () {
    function Annotation(_ref) {
      var _ref$x = _ref.x,
          x = _ref$x === undefined ? 0 : _ref$x,
          _ref$y = _ref.y,
          y = _ref$y === undefined ? 0 : _ref$y,
          nx = _ref.nx,
          ny = _ref.ny,
          _ref$dy = _ref.dy,
          dy = _ref$dy === undefined ? 0 : _ref$dy,
          _ref$dx = _ref.dx,
          dx = _ref$dx === undefined ? 0 : _ref$dx,
          _ref$color = _ref.color,
          color = _ref$color === undefined ? "grey" : _ref$color,
          data = _ref.data,
          type = _ref.type,
          subject = _ref.subject,
          connector = _ref.connector,
          note = _ref.note,
          disable = _ref.disable,
          id = _ref.id,
          className = _ref.className;
      classCallCheck(this, Annotation);

      this._dx = nx !== undefined ? nx - x : dx;
      this._dy = ny !== undefined ? ny - y : dy;
      this._x = x;
      this._y = y;
      this._color = color;
      this.id = id;
      this._className = className || "";

      this._type = type || "";
      this.data = data;

      this.note = note || {};
      this.connector = connector || {};
      this.subject = subject || {};

      this.disable = disable || [];
    }

    createClass(Annotation, [{
      key: "updatePosition",
      value: function updatePosition() {
        if (this.type.setPosition) {
          this.type.setPosition();
          if (this.type.subject && this.type.subject.selectAll(":not(.handle)").nodes().length !== 0) {
            this.type.redrawSubject();
          }
        }
      }
    }, {
      key: "clearComponents",
      value: function clearComponents() {
        this.type.clearComponents && this.type.clearComponents();
      }
    }, {
      key: "updateOffset",
      value: function updateOffset() {
        if (this.type.setOffset) {
          this.type.setOffset();

          if (this.type.connector.selectAll(":not(.handle)").nodes().length !== 0) {
            this.type.redrawConnector();
          }

          this.type.redrawNote();
        }
      }
    }, {
      key: "className",
      get: function get$$1() {
        return this._className;
      },
      set: function set$$1(className) {
        this._className = className;
        if (this.type.setClassName) this.type.setClassName();
      }
    }, {
      key: "type",
      get: function get$$1() {
        return this._type;
      },
      set: function set$$1(type) {
        this._type = type;
        this.clearComponents();
      }
    }, {
      key: "x",
      get: function get$$1() {
        return this._x;
      },
      set: function set$$1(x) {
        this._x = x;
        this.updatePosition();
      }
    }, {
      key: "y",
      get: function get$$1() {
        return this._y;
      },
      set: function set$$1(y) {
        this._y = y;
        this.updatePosition();
      }
    }, {
      key: "color",
      get: function get$$1() {
        return this._color;
      },
      set: function set$$1(color) {
        this._color = color;
        this.updatePosition();
      }
    }, {
      key: "dx",
      get: function get$$1() {
        return this._dx;
      },
      set: function set$$1(dx) {
        this._dx = dx;
        this.updateOffset();
      }
    }, {
      key: "dy",
      get: function get$$1() {
        return this._dy;
      },
      set: function set$$1(dy) {
        this._dy = dy;
        this.updateOffset();
      }
    }, {
      key: "nx",
      set: function set$$1(nx) {
        this._dx = nx - this._x;
        this.updateOffset();
      }
    }, {
      key: "ny",
      set: function set$$1(ny) {
        this._dy = ny - this._y;
        this.updateOffset();
      }
    }, {
      key: "offset",
      get: function get$$1() {
        return { x: this._dx, y: this._dy };
      },
      set: function set$$1(_ref2) {
        var x = _ref2.x,
            y = _ref2.y;

        this._dx = x;
        this._dy = y;
        this.updateOffset();
      }
    }, {
      key: "position",
      get: function get$$1() {
        return { x: this._x, y: this._y };
      },
      set: function set$$1(_ref3) {
        var x = _ref3.x,
            y = _ref3.y;

        this._x = x;
        this._y = y;
        this.updatePosition();
      }
    }, {
      key: "translation",
      get: function get$$1() {
        return {
          x: this._x + this._dx,
          y: this._y + this._dy
        };
      }
    }, {
      key: "json",
      get: function get$$1() {
        var json = {
          x: this._x,
          y: this._y,
          dx: this._dx,
          dy: this._dy
        };

        if (this.data && Object.keys(this.data).length > 0) json.data = this.data;
        if (this.type) json.type = this.type;
        if (this._className) json.className = this._className;

        if (Object.keys(this.connector).length > 0) json.connector = this.connector;
        if (Object.keys(this.subject).length > 0) json.subject = this.subject;
        if (Object.keys(this.note).length > 0) json.note = this.note;

        return json;
      }
    }]);
    return Annotation;
  })();

  (function () {
    function AnnotationCollection(_ref) {
      var annotations = _ref.annotations,
          accessors = _ref.accessors,
          accessorsInverse = _ref.accessorsInverse;
      classCallCheck(this, AnnotationCollection);

      this.accessors = accessors;
      this.accessorsInverse = accessorsInverse;
      this.annotations = annotations;
    }

    createClass(AnnotationCollection, [{
      key: "clearTypes",
      value: function clearTypes(newSettings) {
        this.annotations.forEach(function (d) {
          d.type = undefined;
          d.subject = newSettings && newSettings.subject || d.subject;
          d.connector = newSettings && newSettings.connector || d.connector;
          d.note = newSettings && newSettings.note || d.note;
        });
      }
    }, {
      key: "setPositionWithAccessors",
      value: function setPositionWithAccessors() {
        var _this = this;

        this.annotations.forEach(function (d) {
          d.type.setPositionWithAccessors(_this.accessors);
        });
      }
    }, {
      key: "editMode",
      value: function editMode(_editMode) {
        this.annotations.forEach(function (a) {
          if (a.type) {
            a.type.editMode = _editMode;
            a.type.updateEditMode();
          }
        });
      }
    }, {
      key: "updateDisable",
      value: function updateDisable(disable) {
        this.annotations.forEach(function (a) {
          a.disable = disable;
          if (a.type) {
            disable.forEach(function (d) {
              if (a.type[d]) {
                a.type[d].remove && a.type[d].remove();
                a.type[d] = undefined;
              }
            });
          }
        });
      }
    }, {
      key: "updateTextWrap",
      value: function updateTextWrap(textWrap) {
        this.annotations.forEach(function (a) {
          if (a.type && a.type.updateTextWrap) {
            a.type.updateTextWrap(textWrap);
          }
        });
      }
    }, {
      key: "updateText",
      value: function updateText() {
        this.annotations.forEach(function (a) {
          if (a.type && a.type.drawText) {
            a.type.drawText();
          }
        });
      }
    }, {
      key: "updateNotePadding",
      value: function updateNotePadding(notePadding) {
        this.annotations.forEach(function (a) {
          if (a.type) {
            a.type.notePadding = notePadding;
          }
        });
      }
    }, {
      key: "json",
      get: function get$$1() {
        var _this2 = this;

        return this.annotations.map(function (a) {
          var json = a.json;
          if (_this2.accessorsInverse && a.data) {
            json.data = {};
            Object.keys(_this2.accessorsInverse).forEach(function (k) {
              json.data[k] = _this2.accessorsInverse[k]({ x: a.x, y: a.y });

              //TODO make this feasible to map back to data for other types of subjects
            });
          }
          return json;
        });
      }
    }, {
      key: "noteNodes",
      get: function get$$1() {
        return this.annotations.map(function (a) {
          return _extends({}, a.type.getNoteBBoxOffset(), { positionX: a.x, positionY: a.y });
        });
      }

      //TODO: come back and rethink if a.x and a.y are applicable in all situations
      // get connectorNodes() {
      //   return this.annotations.map(a => ({ ...a.type.getConnectorBBox(), startX: a.x, startY: a.y}))
      // }

      // get subjectNodes() {
      //   return this.annotations.map(a => ({ ...a.type.getSubjectBBox(), startX: a.x, startY: a.y}))
      // }

      // get annotationNodes() {
      //   return this.annotations.map(a => ({ ...a.type.getAnnotationBBox(), startX: a.x, startY: a.y}))
      // }

    }]);
    return AnnotationCollection;
  })();

  var pointHandle = function pointHandle(_ref) {
    var _ref$cx = _ref.cx,
        cx = _ref$cx === undefined ? 0 : _ref$cx,
        _ref$cy = _ref.cy,
        cy = _ref$cy === undefined ? 0 : _ref$cy;

    return { move: { x: cx, y: cy } };
  };

  var circleHandles = function circleHandles(_ref2) {
    var _ref2$cx = _ref2.cx,
        cx = _ref2$cx === undefined ? 0 : _ref2$cx,
        _ref2$cy = _ref2.cy,
        cy = _ref2$cy === undefined ? 0 : _ref2$cy,
        r1 = _ref2.r1,
        r2 = _ref2.r2,
        padding = _ref2.padding;

    var h = { move: { x: cx, y: cy } };

    if (r1 !== undefined) {
      h.r1 = { x: cx + r1 / Math.sqrt(2), y: cy + r1 / Math.sqrt(2) };
    }

    if (r2 !== undefined) {
      h.r2 = { x: cx + r2 / Math.sqrt(2), y: cy + r2 / Math.sqrt(2) };
    }

    if (padding !== undefined) {
      h.padding = { x: cx + r1 + padding, y: cy };
    }

    return h;
  };





  //arc handles
  var addHandles = function addHandles(_ref5) {
    var group = _ref5.group,
        handles = _ref5.handles,
        _ref5$r = _ref5.r,
        r = _ref5$r === undefined ? 10 : _ref5$r;

    //give it a group and x,y to draw handles
    //then give it instructions on what the handles change
    var h = group.selectAll("circle.handle").data(handles);

    h.enter().append("circle").attr("class", "handle").attr("fill", "grey").attr("fill-opacity", 0.1).attr("cursor", "move").attr("stroke-dasharray", 5).attr("stroke", "grey").call(drag().container(select("g.annotations").node()).on("start", function (d) {
      return d.start && d.start(d);
    }).on("drag", function (d) {
      return d.drag && d.drag(d);
    }).on("end", function (d) {
      return d.end && d.end(d);
    }));

    group.selectAll("circle.handle").attr("cx", function (d) {
      return d.x;
    }).attr("cy", function (d) {
      return d.y;
    }).attr("r", function (d) {
      return d.r || r;
    }).attr("class", function (d) {
      return "handle " + (d.className || "");
    });

    h.exit().remove();
  };

  var leftRightDynamic = function leftRightDynamic(align, y) {
    if (align === "dynamic" || align === "left" || align === "right") {
      if (y < 0) {
        align = "top";
      } else {
        align = "bottom";
      }
    }
    return align;
  };

  var topBottomDynamic = function topBottomDynamic(align, x) {
    if (align === "dynamic" || align === "top" || align === "bottom") {
      if (x < 0) {
        align = "right";
      } else {
        align = "left";
      }
    }
    return align;
  };

  var orientationTopBottom = ["topBottom", "top", "bottom"];
  var orientationLeftRight = ["leftRight", "left", "right"];

  var noteAlignment = (function (_ref) {
    var _ref$padding = _ref.padding,
        padding = _ref$padding === undefined ? 0 : _ref$padding,
        _ref$bbox = _ref.bbox,
        bbox = _ref$bbox === undefined ? { x: 0, width: 0, height: 0 } : _ref$bbox,
        align = _ref.align,
        orientation = _ref.orientation,
        _ref$offset = _ref.offset,
        offset = _ref$offset === undefined ? { x: 0, y: 0 } : _ref$offset;

    var x = -bbox.x;
    var y = 0; //-bbox.y
    if (orientationTopBottom.indexOf(orientation) !== -1) {
      align = topBottomDynamic(align, offset.x);
      if (offset.y < 0 && orientation === "topBottom" || orientation === "top") {
        y -= bbox.height + padding;
      } else {
        y += padding;
      }

      if (align === "middle") {
        x -= bbox.width / 2;
      } else if (align === "right") {
        x -= bbox.width;
      }
    } else if (orientationLeftRight.indexOf(orientation) !== -1) {
      align = leftRightDynamic(align, offset.y);
      if (offset.x < 0 && orientation === "leftRight" || orientation === "left") {
        x -= bbox.width + padding;
      } else {
        x += padding;
      }

      if (align === "middle") {
        y -= bbox.height / 2;
      } else if (align === "top") {
        y -= bbox.height;
      }
    }

    return { x: x, y: y };
  });

  var lineBuilder = function lineBuilder(_ref) {
    var data = _ref.data,
        _ref$curve = _ref.curve,
        curve = _ref$curve === undefined ? curveLinear : _ref$curve,
        canvasContext = _ref.canvasContext,
        className = _ref.className,
        classID = _ref.classID;

    var lineGen = line().curve(curve);

    var builder = {
      type: 'path',
      className: className,
      classID: classID,
      data: data
    };

    if (canvasContext) {
      lineGen.context(canvasContext);
      builder.pathMethods = lineGen;
    } else {
      builder.attrs = {
        d: lineGen(data)
      };
    }

    return builder;
  };

  var arcBuilder = function arcBuilder(_ref2) {
    var data = _ref2.data,
        canvasContext = _ref2.canvasContext,
        className = _ref2.className,
        classID = _ref2.classID;


    var builder = {
      type: 'path',
      className: className,
      classID: classID,
      data: data
    };

    var arcShape = arc().innerRadius(data.innerRadius || 0).outerRadius(data.outerRadius || data.radius || 2).startAngle(data.startAngle || 0).endAngle(data.endAngle || 2 * Math.PI);

    if (canvasContext) {
      arcShape.context(canvasContext);
      builder.pathMethods = lineGen;
    } else {

      builder.attrs = {
        d: arcShape()
      };
    }

    return builder;
  };

  var noteVertical = (function (_ref) {
    var align = _ref.align,
        _ref$x = _ref.x,
        x = _ref$x === undefined ? 0 : _ref$x,
        _ref$y = _ref.y,
        y = _ref$y === undefined ? 0 : _ref$y,
        bbox = _ref.bbox,
        offset = _ref.offset;

    align = leftRightDynamic(align, offset.y);

    if (align === "top") {
      y -= bbox.height;
    } else if (align === "middle") {
      y -= bbox.height / 2;
    }

    var data = [[x, y], [x, y + bbox.height]];
    return { components: [lineBuilder({ data: data, className: "note-line" })] };
  });

  var noteHorizontal = (function (_ref) {
    var align = _ref.align,
        _ref$x = _ref.x,
        x = _ref$x === undefined ? 0 : _ref$x,
        _ref$y = _ref.y,
        y = _ref$y === undefined ? 0 : _ref$y,
        offset = _ref.offset,
        bbox = _ref.bbox;

    align = topBottomDynamic(align, offset.x);

    if (align === "right") {
      x -= bbox.width;
    } else if (align === "middle") {
      x -= bbox.width / 2;
    }

    var data = [[x, y], [x + bbox.width, y]];
    return { components: [lineBuilder({ data: data, className: "note-line" })] };
  });

  var lineSetup = function lineSetup(_ref) {
    var type = _ref.type,
        subjectType = _ref.subjectType;

    var annotation = type.annotation;
    var offset = annotation.position;

    var x1 = annotation.x - offset.x,
        x2 = x1 + annotation.dx,
        y1 = annotation.y - offset.y,
        y2 = y1 + annotation.dy;

    var subjectData = annotation.subject;

    if (subjectType === "circle" && (subjectData.outerRadius || subjectData.radius)) {
      var h = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      var angle = Math.asin(-y2 / h);
      var r = subjectData.outerRadius || subjectData.radius + (subjectData.radiusPadding || 0);

      x1 = Math.abs(Math.cos(angle) * r) * (x2 < 0 ? -1 : 1);
      y1 = Math.abs(Math.sin(angle) * r) * (y2 < 0 ? -1 : 1);
    }

    if (subjectType === "rect") {
      var width = subjectData.width,
          height = subjectData.height;


      if (width > 0 && annotation.dx > 0 || width < 0 && annotation.dx < 0) {
        if (Math.abs(width) > Math.abs(annotation.dx)) x1 = width / 2;else x1 = width;
      }
      if (height > 0 && annotation.dy > 0 || height < 0 && annotation.dy < 0) {
        if (Math.abs(height) > Math.abs(annotation.dy)) y1 = height / 2;else y1 = height;
      }
      if (x1 === width / 2 && y1 === height / 2) {
        x1 = x2;y1 = y2;
      }
    }

    return [[x1, y1], [x2, y2]];
  };

  var connectorLine = (function (connectorData) {
    var data = lineSetup(connectorData);
    return { components: [lineBuilder({ data: data, className: "connector" })] };
  });

  var connectorElbow = (function (_ref) {
    var type = _ref.type,
        subjectType = _ref.subjectType;


    var annotation = type.annotation;
    var offset = annotation.position;

    var x1 = annotation.x - offset.x,
        x2 = x1 + annotation.dx,
        y1 = annotation.y - offset.y,
        y2 = y1 + annotation.dy;

    var subjectData = annotation.subject;

    if (subjectType === "rect") {
      var width = subjectData.width,
          height = subjectData.height;


      if (width > 0 && annotation.dx > 0 || width < 0 && annotation.dx < 0) {
        if (Math.abs(width) > Math.abs(annotation.dx)) x1 = width / 2;else x1 = width;
      }
      if (height > 0 && annotation.dy > 0 || height < 0 && annotation.dy < 0) {
        if (Math.abs(height) > Math.abs(annotation.dy)) y1 = height / 2;else y1 = height;
      }
      if (x1 === width / 2 && y1 === height / 2) {
        x1 = x2;y1 = y2;
      }
    }

    var data = [[x1, y1], [x2, y2]];

    var diffY = y2 - y1;
    var diffX = x2 - x1;
    var xe = x2;
    var ye = y2;
    var opposite = y2 < y1 && x2 > x1 || x2 < x1 && y2 > y1 ? -1 : 1;

    if (Math.abs(diffX) < Math.abs(diffY)) {
      xe = x2;
      ye = y1 + diffX * opposite;
    } else {
      ye = y2;
      xe = x1 + diffY * opposite;
    }

    if (subjectType === "circle" && (subjectData.outerRadius || subjectData.radius)) {
      var r = (subjectData.outerRadius || subjectData.radius) + (subjectData.radiusPadding || 0);
      var length = r / Math.sqrt(2);

      if (Math.abs(diffX) > length && Math.abs(diffY) > length) {
        x1 = length * (x2 < 0 ? -1 : 1);
        y1 = length * (y2 < 0 ? -1 : 1);
        data = [[x1, y1], [xe, ye], [x2, y2]];
      } else if (Math.abs(diffX) > Math.abs(diffY)) {
        var angle = Math.asin(-y2 / r);
        x1 = Math.abs(Math.cos(angle) * r) * (x2 < 0 ? -1 : 1);
        data = [[x1, y2], [x2, y2]];
      } else {
        var _angle = Math.acos(x2 / r);
        y1 = Math.abs(Math.sin(_angle) * r) * (y2 < 0 ? -1 : 1);
        data = [[x2, y1], [x2, y2]];
      }
    } else {
      data = [[x1, y1], [xe, ye], [x2, y2]];
    }

    return { components: [lineBuilder({ data: data, className: "connector" })] };
  });

  var connectorCurve = (function (_ref) {
    var type = _ref.type,
        connectorData = _ref.connectorData,
        subjectType = _ref.subjectType;


    if (!connectorData) {
      connectorData = {};
    }
    if (!connectorData.points || typeof connectorData.points === "number") {
      connectorData.points = createPoints(type.annotation.offset, connectorData.points);
    }
    if (!connectorData.curve) {
      connectorData.curve = curveCatmullRom;
    }

    var handles = [];

    if (type.editMode) {
      var cHandles = connectorData.points.map(function (c, i) {
        return _extends({}, pointHandle({ cx: c[0], cy: c[1] }), { index: i });
      });

      var updatePoint = function updatePoint(index) {
        connectorData.points[index][0] += event.dx;
        connectorData.points[index][1] += event.dy;
        type.redrawConnector();
      };

      handles = type.mapHandles(cHandles.map(function (h) {
        return _extends({}, h.move, { drag: updatePoint.bind(type, h.index) });
      }));
    }

    var data = lineSetup({ type: type, subjectType: subjectType });
    data = [data[0]].concat(toConsumableArray(connectorData.points), [data[1]]);
    var components = [lineBuilder({ data: data, curve: connectorData.curve, className: "connector" })];

    return { components: components, handles: handles };
  });

  var createPoints = function createPoints(offset) {
    var anchors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;

    var diff = { x: offset.x / (anchors + 1), y: offset.y / (anchors + 1) };
    var p = [];

    var i = 1;
    for (; i <= anchors; i++) {
      p.push([diff.x * i + i % 2 * 20, diff.y * i - i % 2 * 20]);
    }
    return p;
  };

  var connectorArrow = (function (_ref) {
    var annotation = _ref.annotation,
        start = _ref.start,
        end = _ref.end,
        _ref$scale = _ref.scale,
        scale = _ref$scale === undefined ? 1 : _ref$scale;

    var offset = annotation.position;
    if (!start) {
      start = [annotation.dx, annotation.dy];
    } else {
      start = [-end[0] + start[0], -end[1] + start[1]];
    }
    if (!end) {
      end = [annotation.x - offset.x, annotation.y - offset.y];
    }

    var x1 = end[0],
        y1 = end[1];

    var dx = start[0];
    var dy = start[1];

    var size = 10 * scale;
    var angleOffset = 16 / 180 * Math.PI;
    var angle = Math.atan(dy / dx);

    if (dx < 0) {
      angle += Math.PI;
    }

    var data = [[x1, y1], [Math.cos(angle + angleOffset) * size + x1, Math.sin(angle + angleOffset) * size + y1], [Math.cos(angle - angleOffset) * size + x1, Math.sin(angle - angleOffset) * size + y1], [x1, y1]];

    //TODO add in reverse
    // if (canvasContext.arrowReverse){
    //   data = [[x1, y1],
    //   [Math.cos(angle + angleOffset)*size, Math.sin(angle + angleOffset)*size],
    //   [Math.cos(angle - angleOffset)*size, Math.sin(angle - angleOffset)*size],
    //   [x1, y1]
    //   ]
    // } else {
    //   data = [[x1, y1],
    //   [Math.cos(angle + angleOffset)*size, Math.sin(angle + angleOffset)*size],
    //   [Math.cos(angle - angleOffset)*size, Math.sin(angle - angleOffset)*size],
    //   [x1, y1]
    //   ]
    // }

    return {
      components: [lineBuilder({
        data: data,
        className: "connector-end connector-arrow",
        classID: "connector-end"
      })]
    };
  });

  var connectorDot = (function (_ref) {
    var line$$1 = _ref.line,
        _ref$scale = _ref.scale,
        scale = _ref$scale === undefined ? 1 : _ref$scale;

    var dot = arcBuilder({
      className: "connector-end connector-dot",
      classID: "connector-end",
      data: { radius: 3 * Math.sqrt(scale) }
    });
    dot.attrs.transform = "translate(" + line$$1.data[0][0] + ", " + line$$1.data[0][1] + ")";

    return { components: [dot] };
  });

  var subjectCircle = (function (_ref) {
    var subjectData = _ref.subjectData,
        type = _ref.type;

    if (!subjectData.radius && !subjectData.outerRadius) {
      subjectData.radius = 20;
    }

    var handles = [];
    var c = arcBuilder({ data: subjectData, className: "subject" });
    if (type.editMode) {
      var h = circleHandles({
        r1: c.data.outerRadius || c.data.radius,
        r2: c.data.innerRadius,
        padding: subjectData.radiusPadding
      });

      var updateRadius = function updateRadius(attr) {
        var r = subjectData[attr] + event.dx * Math.sqrt(2);
        subjectData[attr] = r;
        type.redrawSubject();
        type.redrawConnector();
      };

      var cHandles = [_extends({}, h.r1, {
        drag: updateRadius.bind(type, subjectData.outerRadius !== undefined ? "outerRadius" : "radius")
      })];

      if (subjectData.innerRadius) {
        cHandles.push(_extends({}, h.r2, { drag: updateRadius.bind(type, "innerRadius") }));
      }
      handles = type.mapHandles(cHandles);
    }

    c.attrs["fill-opacity"] = 0;

    return { components: [c], handles: handles };
  });

  var subjectRect = (function (_ref) {
    var subjectData = _ref.subjectData,
        type = _ref.type;

    if (!subjectData.width) {
      subjectData.width = 100;
    }
    if (!subjectData.height) {
      subjectData.height = 100;
    }

    var handles = [];
    var width = subjectData.width,
        height = subjectData.height;


    var data = [[0, 0], [width, 0], [width, height], [0, height], [0, 0]];
    var rect = lineBuilder({ data: data, className: "subject" });

    if (type.editMode) {
      var updateWidth = function updateWidth() {
        subjectData.width = event.x;
        type.redrawSubject();
        type.redrawConnector();
      };

      var updateHeight = function updateHeight() {
        subjectData.height = event.y;
        type.redrawSubject();
        type.redrawConnector();
      };

      var rHandles = [{ x: width, y: height / 2, drag: updateWidth.bind(type) }, { x: width / 2, y: height, drag: updateHeight.bind(type) }];

      handles = type.mapHandles(rHandles);
    }
    rect.attrs["fill-opacity"] = 0.1;
    return { components: [rect], handles: handles };
  });

  var subjectThreshold = (function (_ref) {
    var subjectData = _ref.subjectData,
        type = _ref.type;

    var offset = type.annotation.position;

    var x1 = (subjectData.x1 !== undefined ? subjectData.x1 : offset.x) - offset.x,
        x2 = (subjectData.x2 !== undefined ? subjectData.x2 : offset.x) - offset.x,
        y1 = (subjectData.y1 !== undefined ? subjectData.y1 : offset.y) - offset.y,
        y2 = (subjectData.y2 !== undefined ? subjectData.y2 : offset.y) - offset.y;

    var data = [[x1, y1], [x2, y2]];
    return { components: [lineBuilder({ data: data, className: 'subject' })] };
  });

  var subjectBadge = (function (_ref) {
    var _ref$subjectData = _ref.subjectData,
        subjectData = _ref$subjectData === undefined ? {} : _ref$subjectData,
        _ref$type = _ref.type,
        type = _ref$type === undefined ? {} : _ref$type;
    var annotation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var typeSettings = type.typeSettings && type.typeSettings.subject;

    if (!subjectData.radius) {
      if (typeSettings && typeSettings.radius) {
        subjectData.radius = typeSettings.radius;
      } else {
        subjectData.radius = 14;
      }
    }
    if (!subjectData.x) {
      if (typeSettings && typeSettings.x) {
        subjectData.x = typeSettings.x;
      }
    }
    if (!subjectData.y) {
      if (typeSettings && typeSettings.y) {
        subjectData.y = typeSettings.y;
      }
    }

    var handles = [];
    var components = [];
    var radius = subjectData.radius;
    var innerRadius = radius * 0.7;
    var x = 0;
    var y = 0;

    var notCornerOffset = Math.sqrt(2) * radius;
    var placement = {
      xleftcorner: -radius,
      xrightcorner: radius,
      ytopcorner: -radius,
      ybottomcorner: radius,
      xleft: -notCornerOffset,
      xright: notCornerOffset,
      ytop: -notCornerOffset,
      ybottom: notCornerOffset
    };

    if (subjectData.x && !subjectData.y) {
      x = placement["x" + subjectData.x];
    } else if (subjectData.y && !subjectData.x) {
      y = placement["y" + subjectData.y];
    } else if (subjectData.x && subjectData.y) {
      x = placement["x" + subjectData.x + "corner"];
      y = placement["y" + subjectData.y + "corner"];
    }

    var transform = "translate(" + x + ", " + y + ")";
    var circlebg = arcBuilder({ className: "subject", data: { radius: radius } });
    circlebg.attrs.transform = transform;
    circlebg.attrs.fill = annotation.color;
    circlebg.attrs["stroke-linecap"] = "round";
    circlebg.attrs["stroke-width"] = "3px";

    var circle = arcBuilder({
      className: "subject-ring",
      data: { outerRadius: radius, innerRadius: innerRadius }
    });

    circle.attrs.transform = transform;
    // circle.attrs.fill = annotation.color
    circle.attrs["stroke-width"] = "3px";
    circle.attrs.fill = "white";

    var pointer = void 0;
    if (x && y || !x && !y) {
      pointer = lineBuilder({
        className: "subject-pointer",
        data: [[0, 0], [x || 0, 0], [0, y || 0], [0, 0]]
      });
    } else if (x || y) {
      var notCornerPointerXY = function notCornerPointerXY(v) {
        var sign = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
        return v && v / Math.sqrt(2) / Math.sqrt(2) || sign * radius / Math.sqrt(2);
      };

      pointer = lineBuilder({
        className: "subject-pointer",
        data: [[0, 0], [notCornerPointerXY(x), notCornerPointerXY(y)], [notCornerPointerXY(x, -1), notCornerPointerXY(y, -1)], [0, 0]]
      });
    }

    if (pointer) {
      pointer.attrs.fill = annotation.color;
      pointer.attrs["stroke-linecap"] = "round";
      pointer.attrs["stroke-width"] = "3px";
      components.push(pointer);
    }

    if (type.editMode) {
      var dragBadge = function dragBadge() {
        subjectData.x = event.x < -radius * 2 ? "left" : event.x > radius * 2 ? "right" : undefined;
        subjectData.y = event.y < -radius * 2 ? "top" : event.y > radius * 2 ? "bottom" : undefined;

        type.redrawSubject();
      };

      var bHandles = { x: x * 2, y: y * 2, drag: dragBadge.bind(type) };
      if (!bHandles.x && !bHandles.y) {
        bHandles.y = -radius;
      }

      handles = type.mapHandles([bHandles]);
    }

    var text = void 0;
    if (subjectData.text) {
      text = {
        type: "text",
        className: "badge-text",
        attrs: {
          fill: "white",
          stroke: "none",
          "font-size": ".7em",
          text: subjectData.text,
          "text-anchor": "middle",
          dy: ".25em",
          x: x,
          y: y
        }
      };
    }

    components.push(circlebg);
    components.push(circle);
    components.push(text);

    return { components: components, handles: handles };
  });

  //Note options
  //Connector options
  //Subject options
  var Type = function () {
    function Type(_ref) {
      var a = _ref.a,
          annotation = _ref.annotation,
          editMode = _ref.editMode,
          dispatcher = _ref.dispatcher,
          notePadding = _ref.notePadding,
          accessors = _ref.accessors;
      classCallCheck(this, Type);

      this.a = a;

      this.note = annotation.disable.indexOf("note") === -1 && a.select("g.annotation-note");
      this.noteContent = this.note && a.select("g.annotation-note-content");
      this.connector = annotation.disable.indexOf("connector") === -1 && a.select("g.annotation-connector");
      this.subject = annotation.disable.indexOf("subject") === -1 && a.select("g.annotation-subject");
      this.dispatcher = dispatcher;

      if (dispatcher) {
        var handler = addHandlers.bind(null, dispatcher, annotation);
        handler({ component: this.note, name: "note" });
        handler({ component: this.connector, name: "connector" });
        handler({ component: this.subject, name: "subject" });
      }

      this.annotation = annotation;
      this.editMode = annotation.editMode || editMode;
      this.notePadding = notePadding !== undefined ? notePadding : 3;
      this.offsetCornerX = 0;
      this.offsetCornerY = 0;

      if (accessors && annotation.data) {
        this.init(accessors);
      }
    }

    createClass(Type, [{
      key: "init",
      value: function init(accessors) {
        if (!this.annotation.x) {
          this.mapX(accessors);
        }
        if (!this.annotation.y) {
          this.mapY(accessors);
        }
      }
    }, {
      key: "mapY",
      value: function mapY(accessors) {
        if (accessors.y) {
          this.annotation.y = accessors.y(this.annotation.data);
        }
      }
    }, {
      key: "mapX",
      value: function mapX(accessors) {
        if (accessors.x) {
          this.annotation.x = accessors.x(this.annotation.data);
        }
      }
    }, {
      key: "updateEditMode",
      value: function updateEditMode() {
        this.a.selectAll("circle.handle").remove();
      }
    }, {
      key: "drawOnSVG",
      value: function drawOnSVG(component, builders) {
        var _this = this;

        if (!Array.isArray(builders)) {
          builders = [builders];
        }

        builders.filter(function (b) {
          return b;
        }).forEach(function (_ref2) {
          var type = _ref2.type,
              className = _ref2.className,
              attrs = _ref2.attrs,
              handles = _ref2.handles,
              classID = _ref2.classID;

          if (type === "handle") {
            addHandles({ group: component, r: attrs && attrs.r, handles: handles });
          } else {
            newWithClass(component, [_this.annotation], type, className, classID);
            var el = component.select(type + "." + (classID || className));
            var addAttrs = Object.keys(attrs);
            var removeAttrs = [];

            var currentAttrs = el.node().attributes;
            for (var i = currentAttrs.length - 1; i >= 0; i--) {
              var name = currentAttrs[i].name;
              if (addAttrs.indexOf(name) === -1 && name !== "class") removeAttrs.push(name);
            }

            addAttrs.forEach(function (attr) {
              if (attr === "text") {
                el.text(attrs[attr]);
              } else {
                el.attr(attr, attrs[attr]);
              }
            });

            removeAttrs.forEach(function (attr) {
              return el.attr(attr, null);
            });
          }
        });
      }

      //TODO: how to extend this to a drawOnCanvas mode?

    }, {
      key: "getNoteBBox",
      value: function getNoteBBox() {
        return bboxWithoutHandles(this.note, ".annotation-note-content text");
      }
    }, {
      key: "getNoteBBoxOffset",
      value: function getNoteBBoxOffset() {
        var bbox = bboxWithoutHandles(this.note, ".annotation-note-content");
        var transform = this.noteContent.attr("transform").split(/\(|\,|\)/g);
        bbox.offsetCornerX = parseFloat(transform[1]) + this.annotation.dx;
        bbox.offsetCornerY = parseFloat(transform[2]) + this.annotation.dy;
        bbox.offsetX = this.annotation.dx;
        bbox.offsetY = this.annotation.dy;
        return bbox;
      }
    }, {
      key: "drawSubject",
      value: function drawSubject() {
        var _this2 = this;

        var context = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var subjectData = this.annotation.subject;
        var type = context.type;
        var subjectParams = { type: this, subjectData: subjectData };

        var subject = {};
        if (type === "circle") subject = subjectCircle(subjectParams);else if (type === "rect") subject = subjectRect(subjectParams);else if (type === "threshold") subject = subjectThreshold(subjectParams);else if (type === "badge") subject = subjectBadge(subjectParams, this.annotation);

        var _subject = subject,
            _subject$components = _subject.components,
            components = _subject$components === undefined ? [] : _subject$components,
            _subject$handles = _subject.handles,
            handles = _subject$handles === undefined ? [] : _subject$handles;

        components.forEach(function (c) {
          if (c && c.attrs && !c.attrs.stroke) {
            c.attrs.stroke = _this2.annotation.color;
          }
        });

        if (this.editMode) {
          handles = handles.concat(this.mapHandles([{ drag: this.dragSubject.bind(this) }]));
          components.push({ type: "handle", handles: handles });
        }

        return components;
      }
    }, {
      key: "drawConnector",
      value: function drawConnector() {
        var _this3 = this;

        var context = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var connectorData = this.annotation.connector;
        var type = connectorData.type || context.type;
        var connectorParams = { type: this, connectorData: connectorData };
        connectorParams.subjectType = this.typeSettings && this.typeSettings.subject && this.typeSettings.subject.type;

        var connector = {};
        if (type === "curve") connector = connectorCurve(connectorParams);else if (type === "elbow") connector = connectorElbow(connectorParams);else connector = connectorLine(connectorParams);
        var _connector = connector,
            _connector$components = _connector.components,
            components = _connector$components === undefined ? [] : _connector$components,
            _connector$handles = _connector.handles,
            handles = _connector$handles === undefined ? [] : _connector$handles;

        var line$$1 = components[0];
        //TODO: genericize this into fill t/f stroke t/f
        if (line$$1) {
          line$$1.attrs.stroke = this.annotation.color;
          line$$1.attrs.fill = "none";
        }
        var endType = connectorData.end || context.end;
        var end = {};
        if (endType === "arrow") {
          var s = line$$1.data[1];
          var e = line$$1.data[0];
          var distance = Math.sqrt(Math.pow(s[0] - e[0], 2) + Math.pow(s[1] - e[1], 2));
          if (distance < 5 && line$$1.data[2]) {
            s = line$$1.data[2];
          }
          end = connectorArrow({
            annotation: this.annotation,
            start: s,
            end: e,
            scale: connectorData.endScale
          });
        } else if (endType === "dot") {
          end = connectorDot({ line: line$$1, scale: connectorData.endScale });
        } else if (!endType || endType === "none") {
          this.connector && this.connector.select(".connector-end").remove();
        }

        if (end.components) {
          end.components.forEach(function (c) {
            c.attrs.fill = _this3.annotation.color;
            c.attrs.stroke = _this3.annotation.color;
          });
          components = components.concat(end.components);
        }

        if (this.editMode) {
          if (handles.length !== 0) components.push({ type: "handle", handles: handles });
        }
        return components;
      }
    }, {
      key: "drawNote",
      value: function drawNote() {
        var _this4 = this;

        var context = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var noteData = this.annotation.note;
        var align = noteData.align || context.align || "dynamic";
        var noteParams = {
          bbox: context.bbox,
          align: align,
          offset: this.annotation.offset
        };
        var lineType = noteData.lineType || context.lineType;
        var note = {};
        if (lineType === "vertical") note = noteVertical(noteParams);else if (lineType === "horizontal") note = noteHorizontal(noteParams);

        var _note = note,
            _note$components = _note.components,
            components = _note$components === undefined ? [] : _note$components,
            _note$handles = _note.handles,
            handles = _note$handles === undefined ? [] : _note$handles;

        components.forEach(function (c) {
          c.attrs.stroke = _this4.annotation.color;
        });

        if (this.editMode) {
          handles = this.mapHandles([{ x: 0, y: 0, drag: this.dragNote.bind(this) }]);
          components.push({ type: "handle", handles: handles });

          var dragging = this.dragNote.bind(this),
              start = this.dragstarted.bind(this),
              end = this.dragended.bind(this);
          this.note.call(drag().container(select("g.annotations").node()).on("start", function (d) {
            return start(d);
          }).on("drag", function (d) {
            return dragging(d);
          }).on("end", function (d) {
            return end(d);
          }));
        } else {
          this.note.on("mousedown.drag", null);
        }
        return components;
      }
    }, {
      key: "drawNoteContent",
      value: function drawNoteContent(context) {
        var noteData = this.annotation.note;
        var padding = noteData.padding !== undefined ? noteData.padding : this.notePadding;
        var orientation = noteData.orientation || context.orientation || "topBottom";
        var lineType = noteData.lineType || context.lineType;
        var align = noteData.align || context.align || "dynamic";

        if (lineType === "vertical") orientation = "leftRight";else if (lineType === "horizontal") orientation = "topBottom";

        var noteParams = {
          padding: padding,
          bbox: context.bbox,
          offset: this.annotation.offset,
          orientation: orientation,
          align: align
        };

        var _noteAlignment = noteAlignment(noteParams),
            x = _noteAlignment.x,
            y = _noteAlignment.y;

        this.offsetCornerX = x + this.annotation.dx;
        this.offsetCornerY = y + this.annotation.dy;
        this.note && this.noteContent.attr("transform", "translate(" + x + ", " + y + ")");

        return [];
      }
    }, {
      key: "drawOnScreen",
      value: function drawOnScreen(component, drawFunction) {
        return this.drawOnSVG(component, drawFunction);
      }
    }, {
      key: "redrawSubject",
      value: function redrawSubject() {
        this.subject && this.drawOnScreen(this.subject, this.drawSubject());
      }
    }, {
      key: "redrawConnector",
      value: function redrawConnector() {
        this.connector && this.drawOnScreen(this.connector, this.drawConnector());
      }
    }, {
      key: "redrawNote",
      value: function redrawNote() {
        var bbox = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.getNoteBBox();

        this.noteContent && this.drawOnScreen(this.noteContent, this.drawNoteContent({ bbox: bbox }));
        this.note && this.drawOnScreen(this.note, this.drawNote({ bbox: bbox }));
      }
    }, {
      key: "setPosition",
      value: function setPosition() {
        var position = this.annotation.position;
        this.a.attr("transform", "translate(" + position.x + ", " + position.y + ")");
      }
    }, {
      key: "clearComponents",
      value: function clearComponents() {
        this.subject && this.subject.select("*").remove();
        this.connector && this.connector.select("*").remove();
        // this.note && this.note.select("*").remove()
      }
    }, {
      key: "setOffset",
      value: function setOffset() {
        if (this.note) {
          var offset = this.annotation.offset;
          this.note.attr("transform", "translate(" + offset.x + ", " + offset.y + ")");
        }
      }
    }, {
      key: "setPositionWithAccessors",
      value: function setPositionWithAccessors(accessors) {
        if (accessors && this.annotation.data) {
          this.mapX(accessors);
          this.mapY(accessors);
        }
        this.setPosition();
      }
    }, {
      key: "setClassName",
      value: function setClassName() {
        this.a.attr("class", "annotation " + (this.className && this.className()) + " " + (this.editMode ? "editable" : "") + " " + (this.annotation.className || ""));
      }
    }, {
      key: "draw",
      value: function draw() {
        this.setClassName();
        this.setPosition();
        this.setOffset();
        this.redrawSubject();
        this.redrawConnector();
        this.redrawNote();
      }
    }, {
      key: "dragstarted",
      value: function dragstarted() {
        event.sourceEvent.stopPropagation();
        this.dispatcher && this.dispatcher.call("dragstart", this.a, this.annotation);
        this.a.classed("dragging", true);
        this.a.selectAll("circle.handle").style("pointer-events", "none");
      }
    }, {
      key: "dragended",
      value: function dragended() {
        this.dispatcher && this.dispatcher.call("dragend", this.a, this.annotation);
        this.a.classed("dragging", false);
        this.a.selectAll("circle.handle").style("pointer-events", "all");
      }
    }, {
      key: "dragSubject",
      value: function dragSubject() {
        var position = this.annotation.position;
        position.x += event.dx;
        position.y += event.dy;
        this.annotation.position = position;
      }
    }, {
      key: "dragNote",
      value: function dragNote() {
        var offset = this.annotation.offset;
        offset.x += event.dx;
        offset.y += event.dy;
        this.annotation.offset = offset;
      }
    }, {
      key: "mapHandles",
      value: function mapHandles(handles) {
        var _this5 = this;

        return handles.map(function (h) {
          return _extends({}, h, {
            start: _this5.dragstarted.bind(_this5),
            end: _this5.dragended.bind(_this5)
          });
        });
      }
    }]);
    return Type;
  }();

  var customType = function customType(initialType, typeSettings, _init) {
    return function (_initialType) {
      inherits(customType, _initialType);

      function customType(settings) {
        classCallCheck(this, customType);

        var _this6 = possibleConstructorReturn(this, (customType.__proto__ || Object.getPrototypeOf(customType)).call(this, settings));

        _this6.typeSettings = typeSettings;

        if (typeSettings.disable) {
          typeSettings.disable.forEach(function (d) {
            _this6[d] && _this6[d].remove();

            _this6[d] = undefined;
            if (d === "note") {
              _this6.noteContent = undefined;
            }
          });
        }
        return _this6;
      }

      createClass(customType, [{
        key: "className",
        value: function className() {
          return "" + (typeSettings.className || get(customType.prototype.__proto__ || Object.getPrototypeOf(customType.prototype), "className", this) && get(customType.prototype.__proto__ || Object.getPrototypeOf(customType.prototype), "className", this).call(this) || "");
        }
      }, {
        key: "drawSubject",
        value: function drawSubject(context) {
          this.typeSettings.subject = _extends({}, typeSettings.subject, this.typeSettings.subject);
          return get(customType.prototype.__proto__ || Object.getPrototypeOf(customType.prototype), "drawSubject", this).call(this, _extends({}, context, this.typeSettings.subject));
        }
      }, {
        key: "drawConnector",
        value: function drawConnector(context) {
          this.typeSettings.connector = _extends({}, typeSettings.connector, this.typeSettings.connector);
          return get(customType.prototype.__proto__ || Object.getPrototypeOf(customType.prototype), "drawConnector", this).call(this, _extends({}, context, typeSettings.connector, this.typeSettings.connector));
        }
      }, {
        key: "drawNote",
        value: function drawNote(context) {
          this.typeSettings.note = _extends({}, typeSettings.note, this.typeSettings.note);
          return get(customType.prototype.__proto__ || Object.getPrototypeOf(customType.prototype), "drawNote", this).call(this, _extends({}, context, typeSettings.note, this.typeSettings.note));
        }
      }, {
        key: "drawNoteContent",
        value: function drawNoteContent(context) {
          return get(customType.prototype.__proto__ || Object.getPrototypeOf(customType.prototype), "drawNoteContent", this).call(this, _extends({}, context, typeSettings.note, this.typeSettings.note));
        }
      }], [{
        key: "init",
        value: function init(annotation, accessors) {
          get(customType.__proto__ || Object.getPrototypeOf(customType), "init", this).call(this, annotation, accessors);
          if (_init) {
            annotation = _init(annotation, accessors);
          }
          return annotation;
        }
      }]);
      return customType;
    }(initialType);
  };

  var d3NoteText = function (_Type) {
    inherits(d3NoteText, _Type);

    function d3NoteText(params) {
      classCallCheck(this, d3NoteText);

      var _this7 = possibleConstructorReturn(this, (d3NoteText.__proto__ || Object.getPrototypeOf(d3NoteText)).call(this, params));

      _this7.textWrap = params.textWrap || 120;
      _this7.drawText();
      return _this7;
    }

    createClass(d3NoteText, [{
      key: "updateTextWrap",
      value: function updateTextWrap(textWrap) {
        this.textWrap = textWrap;
        this.drawText();
      }

      //TODO: add update text functionality

    }, {
      key: "drawText",
      value: function drawText() {
        if (this.note) {
          newWithClass(this.note, [this.annotation], "g", "annotation-note-content");

          var noteContent = this.note.select("g.annotation-note-content");
          newWithClass(noteContent, [this.annotation], "rect", "annotation-note-bg");
          newWithClass(noteContent, [this.annotation], "text", "annotation-note-label");
          newWithClass(noteContent, [this.annotation], "text", "annotation-note-title");

          var titleBBox = { height: 0 };
          var label = this.a.select("text.annotation-note-label");
          var wrapLength = this.annotation.note && this.annotation.note.wrap || this.typeSettings && this.typeSettings.note && this.typeSettings.note.wrap || this.textWrap;

          var wrapSplitter = this.annotation.note && this.annotation.note.wrapSplitter || this.typeSettings && this.typeSettings.note && this.typeSettings.note.wrapSplitter;

          var bgPadding = this.annotation.note && this.annotation.note.bgPadding || this.typeSettings && this.typeSettings.note && this.typeSettings.note.bgPadding;

          var bgPaddingFinal = { top: 0, bottom: 0, left: 0, right: 0 };
          if (typeof bgPadding === "number") {
            bgPaddingFinal = {
              top: bgPadding,
              bottom: bgPadding,
              left: bgPadding,
              right: bgPadding
            };
          } else if (bgPadding && (typeof bgPadding === "undefined" ? "undefined" : _typeof(bgPadding)) === "object") {
            bgPaddingFinal = _extends(bgPaddingFinal, bgPadding);
          }

          if (this.annotation.note.title) {
            var title = this.a.select("text.annotation-note-title");
            title.text(this.annotation.note.title);
            title.attr("fill", this.annotation.color);
            title.attr("font-weight", "bold");
            title.call(wrap, wrapLength, wrapSplitter);
            titleBBox = title.node().getBBox();
          }

          label.text(this.annotation.note.label).attr("dx", "0");
          label.call(wrap, wrapLength, wrapSplitter);

          label.attr("y", titleBBox.height * 1.1 || 0);
          label.attr("fill", this.annotation.color);

          var bbox = this.getNoteBBox();

          this.a.select("rect.annotation-note-bg").attr("width", bbox.width + bgPaddingFinal.left + bgPaddingFinal.right).attr("height", bbox.height + bgPaddingFinal.top + bgPaddingFinal.bottom).attr("x", bbox.x - bgPaddingFinal.left).attr("y", -bgPaddingFinal.top).attr("fill", "white").attr("fill-opacity", 0);
        }
      }
    }]);
    return d3NoteText;
  }(Type);

  customType(d3NoteText, {
    className: "label",
    note: { align: "middle" }
  });

  var d3Callout = customType(d3NoteText, {
    className: "callout",
    note: { lineType: "horizontal" }
  });

  customType(d3Callout, {
    className: "callout elbow",
    connector: { type: "elbow" }
  });

  customType(d3Callout, {
    className: "callout curve",
    connector: { type: "curve" }
  });

  customType(Type, {
    className: "badge",
    subject: { type: "badge" },
    disable: ["connector", "note"]
  });

  customType(d3NoteText, {
    className: "callout circle",
    subject: { type: "circle" },
    note: { lineType: "horizontal" },
    connector: { type: "elbow" }
  });

  customType(d3NoteText, {
    className: "callout rect",
    subject: { type: "rect" },
    note: { lineType: "horizontal" },
    connector: { type: "elbow" }
  });

  var ThresholdMap = function (_d3Callout) {
    inherits(ThresholdMap, _d3Callout);

    function ThresholdMap() {
      classCallCheck(this, ThresholdMap);
      return possibleConstructorReturn(this, (ThresholdMap.__proto__ || Object.getPrototypeOf(ThresholdMap)).apply(this, arguments));
    }

    createClass(ThresholdMap, [{
      key: "mapY",
      value: function mapY(accessors) {
        get(ThresholdMap.prototype.__proto__ || Object.getPrototypeOf(ThresholdMap.prototype), "mapY", this).call(this, accessors);
        var a = this.annotation;
        if ((a.subject.x1 || a.subject.x2) && a.data && accessors.y) {
          a.y = accessors.y(a.data);
        }
        if ((a.subject.x1 || a.subject.x2) && !a.x) {
          a.x = a.subject.x1 || a.subject.x2;
        }
      }
    }, {
      key: "mapX",
      value: function mapX(accessors) {
        get(ThresholdMap.prototype.__proto__ || Object.getPrototypeOf(ThresholdMap.prototype), "mapX", this).call(this, accessors);
        var a = this.annotation;
        if ((a.subject.y1 || a.subject.y2) && a.data && accessors.x) {
          a.x = accessors.x(a.data);
        }
        if ((a.subject.y1 || a.subject.y2) && !a.y) {
          a.y = a.subject.y1 || a.subject.y2;
        }
      }
    }]);
    return ThresholdMap;
  }(d3Callout);

  customType(ThresholdMap, {
    className: "callout xythreshold",
    subject: { type: "threshold" }
  });

  var newWithClass = function newWithClass(a, d, type, className, classID) {
    var group = a.selectAll(type + "." + (classID || className)).data(d);
    group.enter().append(type).merge(group).attr("class", className);

    group.exit().remove();
    return a;
  };

  var addHandlers = function addHandlers(dispatcher, annotation, _ref3) {
    var component = _ref3.component,
        name = _ref3.name;

    if (component) {
      component.on("mouseover.annotations", function () {
        dispatcher.call(name + "over", component, annotation);
      }).on("mouseout.annotations", function () {
        return dispatcher.call(name + "out", component, annotation);
      }).on("click.annotations", function () {
        return dispatcher.call(name + "click", component, annotation);
      });
    }
  };

  //Text wrapping code adapted from Mike Bostock
  var wrap = function wrap(text, width, wrapSplitter) {
    var lineHeight = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1.2;

    text.each(function () {
      var text = select(this),
          words = text.text().split(wrapSplitter || /[ \t\r\n]+/).reverse().filter(function (w) {
        return w !== "";
      });
      var word = void 0,
          line$$1 = [],
          tspan = text.text(null).append("tspan").attr("x", 0).attr("dy", 0.8 + "em");

      while (word = words.pop()) {
        line$$1.push(word);
        tspan.text(line$$1.join(" "));
        if (tspan.node().getComputedTextLength() > width && line$$1.length > 1) {
          line$$1.pop();
          tspan.text(line$$1.join(" "));
          line$$1 = [word];
          tspan = text.append("tspan").attr("x", 0).attr("dy", lineHeight + "em").text(word);
        }
      }
    });
  };

  var bboxWithoutHandles = function bboxWithoutHandles(selection) {
    var selector = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ":not(.handle)";

    if (!selection) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return selection.selectAll(selector).nodes().reduce(function (p, c) {
      var bbox = c.getBBox();
      p.x = Math.min(p.x, bbox.x);
      p.y = Math.min(p.y, bbox.y);
      p.width = Math.max(p.width, bbox.width);

      var yOffset = c && c.attributes && c.attributes.y;
      p.height = Math.max(p.height, (yOffset && parseFloat(yOffset.value) || 0) + bbox.height);
      return p;
    }, { x: 0, y: 0, width: 0, height: 0 });
  };

  let appState = {
      currentScene: 0,
      masterData: [],
      topDishes: {},
      viewMode: 'popularity', 
      highlightedDish: null,
      filterKeyword: '',
      showAllScenes: false,
      isUpdating: false // Add flag to prevent multiple simultaneous updates
  };

  const scenes = [
      {
          title: "Post-War Beverages: Coffee Culture Emerges (1940-1955)",
          description: "In the post-World War II era, coffee solidified its place as America's dominant beverage, driven by economic prosperity and cultural shifts. Traditional drinks adapted to evolving consumer preferences.",
          dateRange: [1940, 1955],
          era: "postwar",
          keyInsights: [
              {
                  text: "Coffee dominates post-war America",
                  detail: "Coffee begins to appear more frequently, establishing the foundation of American coffee culture"
              },
              {
                  text: "Traditional drinks remain affordable",
                  detail: "Tea and milk maintain consistent, low pricing throughout this period"
              }
          ]
      },
      {
          title: "Mid-Century Cocktail Culture (1955-1975)",
          description: "The mid-20th century witnessed the flourishing of cocktail culture, with mixed drinks gaining prominence as symbols of social status and leisure, reflecting a more sophisticated and experimental drinking scene.",
          dateRange: [1955, 1975],
          era: "midcentury_shift",
          keyInsights: [
              {
                  text: "Cocktail culture peaks",
                  detail: "Mixed drinks like Manhattan and Whiskey Cocktails reach their golden age"
              },
              {
                  text: "Price premiums emerge",
                  detail: "Alcoholic beverages command higher prices, reflecting status consumption"
              }
          ]
      },
      {
          title: "Beverage Diversity: Modern Drinking Habits (1975-1990)",
          description: "The late 20th century brought a significant diversification in American beverage choices. Influences from global cuisines, a burgeoning interest in specialty and artisanal options, and increased health consciousness reshaped drinking habits.",
          dateRange: [1975, 1990],
          era: "latecentury_trends",
          keyInsights: [
              {
                  text: "Beverage specialization begins",
                  detail: "Variety increases as consumers seek premium and specialized options"
              },
              {
                  text: "Price stratification",
                  detail: "Clear price tiers emerge between basic and premium beverage options"
              }
          ]
      }
  ];

  const margin = { top: 60, right: 200, bottom: 120, left: 80 };
  const width = 900 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = select$1("#main-chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const colors = ordinal(category10.concat(Set3));

  Promise.all([
      csv("data/Dish.csv"),
      csv("data/Menu.csv"),
      csv("data/MenuItem.csv"),
      csv("data/MenuPage.csv")
  ]).then(function([dishes, menus, menuItems, menuPages]) {
      
      const dishMap = new Map(dishes.map(d => [+d.id, d]));
      const menuMap = new Map(menus.map(m => [+m.id, m]));
      const menuPageMap = new Map(menuPages.map(mp => [+mp.id, mp]));
      
      function isBeverage(dishName) {
          const name = dishName.toLowerCase();
          
          const foodExclusions = [
              'shrimp cocktail', 'lobster cocktail', 'crab cocktail', 'oyster cocktail',
              'clam cocktail', 'seafood cocktail', 'fruit cocktail', 'jumbo shrimp cocktail'
          ];
          
          if (foodExclusions.some(exclusion => name.includes(exclusion))) {
              return false;
          }
          
          const beverageKeywords = [
              'coffee', 'tea', 'milk', 'wine', 'beer', 'whiskey', 'gin', 'rum', 'vodka', 
              'bourbon', 'brandy', 'cocktail', 'punch', 'soda', 'water', 'juice', 
              'champagne', 'ale', 'lager', 'port', 'sherry', 'cognac', 'liqueur',
              'manhattan', 'martini', 'highball', 'toddy', 'negus', 'julep', 'flip',
              'cordial', 'bitters', 'absinthe', 'vermouth', 'kirsch', 'chartreuse',
              'benedictine', 'drambuie', 'cointreau', 'curacao', 'rye', 'scotch'
          ];
          
          return beverageKeywords.some(keyword => name.includes(keyword));
      }

      const dishYearData = new Map();
      
      menuItems.forEach(mi => {
          const price = parseFloat(mi.price);
          if (isNaN(price) || price <= 0 || !mi.dish_id || !mi.menu_page_id) return;
          
          const dish = dishMap.get(+mi.dish_id);
          const menuPage = menuPageMap.get(+mi.menu_page_id);
          const menu = menuPage ? menuMap.get(+menuPage.menu_id) : null;
          
          if (!dish || !menu || !menu.date) return;
          
          const dishName = dish.name;
          
          if (!isBeverage(dishName)) return;
          
          const year = new Date(menu.date).getFullYear();
          if (isNaN(year) || year < 1940 || year > 1990) return;
          
          const key = `${dishName}-${year}`;
          
          if (!dishYearData.has(key)) {
              dishYearData.set(key, {
                  dishName: dishName,
                  year: year,
                  count: 0,
                  prices: []
              });
          }
          
          const entry = dishYearData.get(key);
          entry.count += 1;
          entry.prices.push(price);
      });
      
      appState.masterData = Array.from(dishYearData.values()).map(d => ({
          dishName: d.dishName,
          year: d.year,
          count: d.count,
          avgPrice: mean(d.prices),
          price: mean(d.prices) // Alias for compatibility
      }));
      
      const yearCounts = rollup(appState.masterData, v => sum(v, d => d.count), d => d.year);
      console.log('Data distribution by year:', Array.from(yearCounts.entries()).sort((a,b) => a[0] - b[0]));
      
      const dataAfter1940 = Array.from(yearCounts.entries()).filter(([year, count]) => year > 1940);
      console.log('Data after 1940:', dataAfter1940);
      
      const minDataThreshold = 5; 
      const validYears = new Set(
          Array.from(yearCounts.entries())
              .filter(([year, count]) => count >= minDataThreshold)
              .map(([year, count]) => year)
      );
      
      appState.masterData = appState.masterData.filter(d => validYears.has(d.year));
      
      scenes.forEach(scene => {
          const [startYear, endYear] = scene.dateRange;
          const eraData = appState.masterData.filter(d => d.year >= startYear && d.year <= endYear);
          
          const beverageTotals = rollup(eraData, 
              v => sum(v, d => d.count), 
              d => d.dishName
          );
          
          const topBeverageNames = Array.from(beverageTotals.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(d => d[0]);
          
          appState.topDishes[scene.era] = topBeverageNames.map(beverageName => {
              const beverageYearlyData = [];
              const rawYearlyData = [];
              
              for (let year = startYear; year <= endYear; year++) {
                  const entry = eraData.find(d => d.dishName === beverageName && d.year === year);
                  const count = entry ? entry.count : 0;
                  const avgPrice = entry ? entry.avgPrice : 0;
                  
                  beverageYearlyData.push({
                      year: year,
                      count: count,
                      avgPrice: avgPrice || 0
                  });
                  rawYearlyData.push(count);
              }
              
              const normalizedData = normalizeData(beverageYearlyData, rawYearlyData);
              
              return {
                  dishName: beverageName,
                  data: normalizedData,
                  totalCount: sum(normalizedData, d => d.count),
                  avgPrice: mean(normalizedData, d => d.avgPrice).toFixed(2)
              };
          }).filter(beverage => beverage.totalCount > 0); 
      });
      
      console.log('Top beverages by era:', appState.topDishes);
      updateScene(0);
      
  }).catch(error => {
      console.error('Error loading data:', error);
  });

  function normalizeData(dishYearlyData, rawYearlyData) {
      const sortedValues = [...rawYearlyData].sort((a, b) => a - b);
      const p75 = quantile(sortedValues, 0.75); 
      const p90 = quantile(sortedValues, 0.90); 
      
      const cap = Math.max(p75 * 2, p90 * 0.8);
      
      const cappedData = dishYearlyData.map(d => {
          let adjustedCount = d.count;
          
          if (adjustedCount > cap) {
              adjustedCount = cap + Math.sqrt(adjustedCount - cap); 
          }
          
          if (d.count > 0 && adjustedCount < 1) {
              adjustedCount = 1;
          }
          
          return {
              ...d,
              count: Math.round(adjustedCount)
          };
      });
      
      return cappedData;
  }

  function updateScene(sceneIndex) {
      if (appState.isUpdating) return; // Prevent multiple simultaneous updates
      
      if (sceneIndex < 0 || sceneIndex >= scenes.length) {
          appState.isUpdating = false;
          return;
      }
      
      appState.isUpdating = true;
      
      // Disable navigation buttons during update
      document.getElementById("prev-btn").disabled = true;
      document.getElementById("next-btn").disabled = true;
      
      const previousScene = appState.currentScene;
      appState.currentScene = sceneIndex;
      const scene = scenes[sceneIndex];
      
      document.getElementById("scene-indicator").textContent = `Scene ${sceneIndex + 1} of ${scenes.length}`;
      
      if (previousScene !== sceneIndex && previousScene >= 0) {
          showSceneTransition(previousScene, sceneIndex);
      }
      
      // Interrupt any ongoing transitions and clear all elements
      g.selectAll("*").interrupt();
      g.selectAll("*").remove();
      
      // Use a small delay to ensure clean state before rendering
      setTimeout(() => {
          try {
              renderBeveragePopularityChart(scene);
              showSceneInsights(scene);
              
              // Apply entrance animation to new elements
              g.selectAll(".beverage-group, .legend, .annotation-group")
                  .style("opacity", 0)
                  .transition()
                  .duration(600)
                  .delay(200)
                  .style("opacity", 1);
              
              // Reset the updating flag after all animations should be complete
              setTimeout(() => {
                  appState.isUpdating = false;
                  // Re-enable navigation buttons with proper state
                  document.getElementById("prev-btn").disabled = appState.currentScene === 0;
                  document.getElementById("next-btn").disabled = appState.currentScene === scenes.length - 1;
              }, 800); // 600ms animation + 200ms delay + buffer
              
          } catch (error) {
              console.error('Error updating scene:', error);
              appState.isUpdating = false;
              // Re-enable navigation buttons with proper state even on error
              document.getElementById("prev-btn").disabled = appState.currentScene === 0;
              document.getElementById("next-btn").disabled = appState.currentScene === scenes.length - 1;
          }
      }, 50);
  }

  function showSceneTransition(fromIndex, toIndex) {
      const fromScene = scenes[fromIndex];
      const toScene = scenes[toIndex];
      
      const transitionDiv = select$1("body")
          .append("div")
          .style("position", "fixed")
          .style("top", "50%")
          .style("left", "50%")
          .style("transform", "translate(-50%, -50%)")
          .style("background", "rgba(44, 62, 80, 0.95)")
          .style("color", "#ecf0f1")
          .style("padding", "20px 30px")
          .style("border-radius", "10px")
          .style("font-size", "16px")
          .style("text-align", "center")
          .style("z-index", "1000")
          .style("opacity", 0)
          .style("box-shadow", "0 4px 20px rgba(0,0,0,0.5)");
      const timeDirection = toIndex > fromIndex ? "later" : "earlier";
      const arrow = toIndex > fromIndex ? "→" : "←";
      
      transitionDiv.html(`
        <div style="margin-bottom: 10px; font-size: 14px; color: #f39c12;">
            <strong>Moving ${timeDirection} in time ${arrow}</strong>
        </div>
        <div style="margin-bottom: 5px;">
            <strong>From:</strong> ${fromScene.dateRange[0]}-${fromScene.dateRange[1]}
        </div>
        <div>
            <strong>To:</strong> ${toScene.dateRange[0]}-${toScene.dateRange[1]}
        </div>
    `);
      
      transitionDiv
          .transition()
          .duration(300)
          .style("opacity", 1)
          .transition()
          .delay(1000)
          .duration(300)
          .style("opacity", 0)
          .remove();
  }

  function renderBeveragePopularityChart(scene) {
      let beverageData;
      let startYear, endYear;
      
      if (appState.showAllScenes) {
          const allBeverageData = [];
          const allBeverageNames = new Set();
          
          Object.values(appState.topDishes).forEach(eraData => {
              eraData.forEach(beverage => allBeverageNames.add(beverage.dishName));
          });
          
          Array.from(allBeverageNames).forEach(beverageName => {
              const combinedYearlyData = [];
              
              for (let year = 1940; year <= 1990; year++) {
                  const entry = appState.masterData.find(d => d.dishName === beverageName && d.year === year);
                  combinedYearlyData.push({
                      year: year,
                      count: entry ? entry.count : 0,
                      avgPrice: entry ? entry.avgPrice : 0
                  });
              }
              
              const totalCount = sum(combinedYearlyData, d => d.count);
              if (totalCount > 0) {
                  allBeverageData.push({
                      dishName: beverageName,
                      data: combinedYearlyData,
                      totalCount: totalCount,
                      avgPrice: mean(combinedYearlyData.filter(d => d.avgPrice > 0), d => d.avgPrice) || 0
                  });
              }
          });
          
          beverageData = allBeverageData
              .sort((a, b) => b.totalCount - a.totalCount)
              .slice(0, 15);
          
          startYear = 1940;
          endYear = 1990;
      } else {
          beverageData = appState.topDishes[scene.era];
          [startYear, endYear] = scene.dateRange;
      }
      
      const xScale = linear()
          .domain([startYear, endYear])
          .range([0, width]);
      
      let maxValue, yAxisLabel;
      let yScale;
      if (appState.viewMode === 'popularity') {
          const allCounts = beverageData.flatMap(d => d.data.map(dd => dd.count));
          maxValue = max(allCounts);
          yAxisLabel = "Popularity Index (Adjusted)";
          yScale = linear();
      } else {
          const allPrices = beverageData.flatMap(d => d.data.map(dd => dd.avgPrice)).filter(p => p > 0);
          
          const cappedPrices = allPrices.filter(price => price <= 100);
          maxValue = max(cappedPrices) || 0; 
          yAxisLabel = "Average Price (USD, super-sqrt scale, capped at $100)";
          yScale = pow().exponent(0.25);
      }
      
      yScale.domain([0, maxValue * 1.1])
          .range([height, 0])
          .nice();
      
      addViewModeControls();
      
      g.append("g")
          .attr("transform", `translate(0,${height})`)
          .call(axisBottom(xScale).tickFormat(format("d")));
      
      g.append("g")
          .call(axisLeft(yScale).tickFormat(d => 
              appState.viewMode === 'price' ? `$${d.toFixed(2)}` : d.toFixed(0)
          ));
      
      g.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x", 0 - (height / 2))
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text(yAxisLabel);
      
      g.append("text")
          .attr("transform", `translate(${width / 2}, ${height + 50})`)
          .style("text-anchor", "middle")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text("Year");
      
      g.append("text")
          .attr("x", width / 2)
          .attr("y", -30)
          .style("text-anchor", "middle")
          .style("font-size", "18px")
          .style("font-weight", "bold")
          .style("fill", "#2c3e50")
          .text(scene.title);
      
      const line = line$1()
          .x(d => xScale(d.year))
          .y(d => yScale(appState.viewMode === 'popularity' ? d.count : Math.min(d.avgPrice, 100))) 
          .curve(monotoneX);
      
      const beverageGroups = g.selectAll(".beverage-group")
          .data(beverageData)
          .enter()
          .append("g")
          .attr("class", "beverage-group")
          .style("opacity", d => {
              return appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.2;
          })
          .style("cursor", "pointer")
          .on("click", function(event, d) {
              toggleBeverageHighlight(d.dishName);
          })
          .on("mouseover", function(event, d) {
              if (appState.highlightedDish === null) {
                  selectAll(".beverage-group").style("opacity", 0.2);
                  select$1(this).style("opacity", 1);
              }
          })
          .on("mouseout", function() {
              if (appState.highlightedDish === null) {
                  selectAll(".beverage-group").style("opacity", 1);
              }
          });
      
      beverageGroups.append("path")
          .datum(d => d.data)
          .attr("fill", "none")
          .attr("stroke", (d, i) => colors(i))
          .attr("stroke-width", (d, i) => appState.highlightedDish === beverageData[i].dishName ? 4 : 2)
          .attr("d", line)
          .style("opacity", 0)
          .transition()
          .duration(1000)
          .delay((d, i) => i * 100)
          .style("opacity", 0.8);
      
      beverageGroups.selectAll(".dot")
          .data(d => d.data.map(dd => ({...dd, dishName: d.dishName})))
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", d => xScale(d.year))
          .attr("cy", d => yScale(appState.viewMode === 'popularity' ? d.count : Math.min(d.avgPrice, 100))) 
          .attr("r", 4)
          .attr("fill", (d, i, nodes) => {
              const parentIndex = Array.from(nodes[0].parentNode.parentNode.children).indexOf(nodes[0].parentNode);
              return colors(parentIndex);
          })
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .style("opacity", 0)
          .on("mouseover", function(event, d) {
              g.selectAll(".tooltip").remove();
              
              const tooltip = g.append("g")
                  .attr("class", "tooltip")
                  .attr("transform", `translate(${select$1(this).attr("cx")}, ${select$1(this).attr("cy")})`);
              
              const tooltipHeight = 40;
              
              tooltip.append("rect")
                  .attr("x", -70)
                  .attr("y", -50)
                  .attr("width", 140)
                  .attr("height", tooltipHeight)
                  .attr("fill", "#2c3e50")
                  .attr("stroke", "#ecf0f1")
                  .attr("rx", 4);
              
              tooltip.append("text")
                  .attr("text-anchor", "middle")
                  .attr("y", -35)
                  .attr("fill", "#ecf0f1")
                  .style("font-size", "11px")
                  .style("font-weight", "bold")
                  .text(d.dishName.length > 18 ? d.dishName.substring(0, 18) + "..." : d.dishName);
              
              let valueText;
              if (appState.viewMode === 'popularity') {
                  valueText = `${d.year}: ${d.count} appearances`;
              } else {
                  valueText = `${d.year}: $${d.avgPrice.toFixed(2)}`;
              }
              
              tooltip.append("text")
                  .attr("text-anchor", "middle")
                  .attr("y", -20)
                  .attr("fill", "#ecf0f1")
                  .style("font-size", "10px")
                  .text(valueText);
          })
          .on("mouseout", function() {
              g.selectAll(".tooltip").remove();
          })
          .transition()
          .duration(800)
          .delay((d, i) => Math.floor(i / (endYear - startYear + 1)) * 100 + 500)
          .style("opacity", 1);
      
      createLegend(beverageData);
      
      addExplorationPanel();
  }

  function createLegend(beverageData) {
      const legend = g.append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${width + 30}, 20)`);
      
      legend.append("text")
          .attr("x", 0)
          .attr("y", 0)
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .style("fill", "#2c3e50")
          .text("Top Beverages");
      
      const legendItems = legend.selectAll(".legend-item")
          .data(beverageData.slice(0, 10)) 
          .enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (d, i) => `translate(0, ${25 + i * 22})`)
          .style("opacity", d => appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.3)
          .on("click", function(event, d) {
              toggleBeverageHighlight(d.dishName);
          })
          .on("mouseover", function(event, d) {
              if (appState.highlightedDish === null) {
                  selectAll(".beverage-group").style("opacity", 0.2);
                  selectAll(".beverage-group").filter(dd => dd.dishName === d.dishName).style("opacity", 1);
                  
                  selectAll(".legend-item").style("opacity", 0.3);
                  select$1(this).style("opacity", 1);
              }
          })
          .on("mouseout", function() {
              if (appState.highlightedDish === null) {
                  selectAll(".beverage-group").style("opacity", 1);
                  selectAll(".legend-item").style("opacity", 1);
              } else {
                  selectAll(".beverage-group").style("opacity", d => d.dishName === appState.highlightedDish ? 1 : 0.2);
                  selectAll(".legend-item").style("opacity", d => d.dishName === appState.highlightedDish ? 1 : 0.3);
              }
          });
      
      legendItems.append("line")
          .attr("x1", 0)
          .attr("x2", 18)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("stroke", (d, i) => colors(i))
          .attr("stroke-width", 3);
      
      legendItems.append("text")
          .attr("x", 25)
          .attr("y", 0)
          .attr("dy", "0.35em")
          .style("font-size", "12px")
          .style("fill", "#2c3e50")
          .style("-webkit-user-select", "none")
          .style("-moz-user-select", "none")
          .style("user-select", "none")
          .text(d => d.dishName.length > 15 ? d.dishName.substring(0, 15) + "..." : d.dishName);
  }

  function addExplorationPanel(beverageData) {
      let explorationPanel = select$1("#exploration-panel");
      if (explorationPanel.empty()) {
          explorationPanel = select$1("body")
              .append("div")
              .attr("id", "exploration-panel")
              .style("position", "fixed")
              .style("bottom", "20px")
              .style("left", "20px")
              .style("width", "320px")
              .style("background", "#34495e")
              .style("color", "#ecf0f1")
              .style("border-radius", "8px")
              .style("padding", "15px")
              .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
              .style("z-index", "100");
      }
      
      explorationPanel.html(`
        <h4 style="margin-top: 0; color: #e74c3c; border-bottom: 1px solid #7f8c8d; padding-bottom: 8px;">
            Deep Exploration Tools
        </h4>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; font-size: 12px; margin-bottom: 5px; color: #bdc3c7;">
                Filter beverages by name:
            </label>
            <input type="text" id="beverage-filter" placeholder="ex. coffee" 
                   style="width: 100%; padding: 5px; border: none; border-radius: 4px; background: #2c3e50; color: #ecf0f1; font-size: 12px;"
                   value="${appState.filterKeyword}">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="display: flex; align-items: center; font-size: 12px; cursor: pointer;">
                <input type="checkbox" id="show-all-scenes" ${appState.showAllScenes ? 'checked' : ''}
                       style="margin-right: 8px;">
                <span>Show data from all periods</span>
            </label>
            <div style="font-size: 10px; color: #bdc3c7; font-style: italic; margin-top: 2px;">
                View beverage trends across the entire timeline
            </div>
        </div>
    `);
      
      select$1("#beverage-filter").on("input", function() {
          appState.filterKeyword = this.value;
          applyBeverageFilter();
      });
      
      select$1("#show-all-scenes").on("change", function() {
          if (appState.isUpdating) {
              this.checked = !this.checked; // Revert checkbox state
              return;
          }
          appState.showAllScenes = this.checked;
          appState.highlightedDish = null;
          updateScene(appState.currentScene);
      });
  }

  function applyBeverageFilter() {
      const keyword = appState.filterKeyword.toLowerCase();
      if (keyword === '') {
          selectAll(".beverage-group").style("display", "block");
          selectAll(".legend-item").style("display", "block");
      } else {
          selectAll(".beverage-group").style("display", function(d) {
              return d.dishName.toLowerCase().includes(keyword) ? "block" : "none";
          });
          selectAll(".legend-item").style("display", function(d) {
              return d.dishName.toLowerCase().includes(keyword) ? "block" : "none";
          });
      }
  }

  function showSceneInsights(scene) {
      const beverageData = appState.topDishes[scene.era];
      const topBeverage = beverageData[0];
      
      let insightsPanel = select$1("#insights-panel");
      if (insightsPanel.empty()) {
          insightsPanel = select$1("body")
              .append("div")
              .attr("id", "insights-panel")
              .style("position", "fixed")
              .style("top", "20px")
              .style("right", "20px")
              .style("width", "300px")
              .style("background", "#2c3e50")
              .style("color", "#ecf0f1")
              .style("border-radius", "8px")
              .style("padding", "20px")
              .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)");
      }
      
      const viewModeText = appState.viewMode === 'popularity' ? 'Most Popular' : 'Most Expensive';
      const mainValue = appState.viewMode === 'popularity' 
          ? `${topBeverage.totalCount} total appearances`
          : `$${topBeverage.avgPrice} average price`;
      
      insightsPanel.html(`
        <h3 style="margin-top: 0; color: #3498db;">${scene.title}</h3>
        <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 13px;"><strong>Main Idea:</strong> ${scene.description}</p>
        </div>
        <p><strong>${viewModeText}:</strong> ${topBeverage.dishName} (${mainValue})</p>
        
        <div style="margin: 15px 0; border: 1px solid #34495e; border-radius: 5px; padding: 10px;">
            <p style="font-size: 14px; margin-bottom: 10px; color: #f39c12;"><strong>How to Explore:</strong></p>
            <div style="font-size: 12px; line-height: 1.4;">
                <div style="margin-bottom: 8px;">
                    <span style="background: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">CLICK</span>
                    <span style="margin-left: 8px;">Legend items or lines to highlight beverages</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="background: #9b59b6; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">HOVER</span>
                    <span style="margin-left: 8px;">Dots for prices/counts, lines for preview</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="background: #27ae60; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">SWITCH</span>
                    <span style="margin-left: 8px;">Between Popularity & Price views below</span>
                </div>
                <div>
                    <span style="background: #f39c12; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">NAVIGATE</span>
                    <span style="margin-left: 8px;">Use Previous/Next for different eras</span>
                </div>
            </div>
        </div>
        
        <div style="border-top: 1px solid #34495e; padding-top: 10px;">
            <p style="font-size: 11px; font-style: italic; opacity: 0.8; margin-bottom: 5px;">
                <strong>Current:</strong> ${appState.viewMode === 'popularity' ? 'Popularity trends' : 'Price trends'}
            </p>
            ${appState.highlightedDish ? 
                `<p style="font-size: 11px; color: #e74c3c; margin: 0;">
                    <strong>Highlighting:</strong> ${appState.highlightedDish} 
                    <span style="font-style: italic;">(click same item to clear)</span>
                </p>` : 
                `<p style="font-size: 11px; color: #27ae60; margin: 0;">
                    <strong>Tip:</strong> Click any beverage to focus on it
                </p>`
            }
        </div>
    `);
  }

  function toggleBeverageHighlight(beverageName) {
      if (appState.highlightedDish === beverageName) {
          appState.highlightedDish = null;
      } else {
          appState.highlightedDish = beverageName;
      }
      
      g.selectAll(".beverage-group")
          .transition().duration(200)
          .style("opacity", d => appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.2);
      
      g.selectAll(".beverage-group path")
          .transition().duration(200)
          .attr("stroke-width", (d, i, nodes) => {
              const parentData = select$1(nodes[i].parentNode).datum();
              return appState.highlightedDish === parentData.dishName ? 4 : 2;
          });
      
      g.selectAll(".legend-item")
          .transition().duration(200)
          .style("opacity", d => appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.3);

      showSceneInsights(scenes[appState.currentScene]);
  }

  function addViewModeControls() {
      g.selectAll(".view-mode-controls").remove();
      
      const viewModeControls = g.append("g")
          .attr("class", "view-mode-controls")
          .attr("transform", `translate(10, ${height + 40})`);

      viewModeControls.append("text")
          .attr("x", 75)
          .attr("y", -8)
          .attr("text-anchor", "middle")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .style("fill", "#f39c12")
          .text("VIEW MODE");

      const popularityGroup = viewModeControls.append("g")
          .attr("class", "view-mode-button")
          .style("cursor", "pointer")
          .on("click", function() {
              if (appState.isUpdating) return;
              appState.viewMode = "popularity";
              updateScene(appState.currentScene);
          })
          .on("mouseover", function() {
              select$1(this).select("rect")
                  .transition().duration(200)
                  .attr("stroke-width", appState.viewMode === 'popularity' ? 2 : 3);
          })
          .on("mouseout", function() {
              select$1(this).select("rect")
                  .transition().duration(200)
                  .attr("stroke-width", 1);
          });

      popularityGroup.append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 80)
          .attr("height", 35)
          .attr("fill", appState.viewMode === 'popularity' ? "#3498db" : "#34495e")
          .attr("stroke", appState.viewMode === 'popularity' ? "#ecf0f1" : "#7f8c8d")
          .attr("stroke-width", appState.viewMode === 'popularity' ? 2 : 1)
          .attr("rx", 6);

      popularityGroup.append("text")
          .attr("x", 40)
          .attr("y", 15)
          .attr("text-anchor", "middle")
          .attr("fill", "#ecf0f1")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .text("Popularity");
          
      popularityGroup.append("text")
          .attr("x", 40)
          .attr("y", 28)
          .attr("text-anchor", "middle")
          .attr("fill", "#bdc3c7")
          .style("font-size", "9px")
          .text("(appearances)");

      const priceGroup = viewModeControls.append("g")
          .attr("class", "view-mode-button")
          .attr("transform", "translate(90, 0)")
          .style("cursor", "pointer")
          .on("click", function() {
              if (appState.isUpdating) return;
              appState.viewMode = "price";
              updateScene(appState.currentScene);
          })
          .on("mouseover", function() {
              select$1(this).select("rect")
                  .transition().duration(200)
                  .attr("stroke-width", appState.viewMode === 'price' ? 2 : 3);
          })
          .on("mouseout", function() {
              select$1(this).select("rect")
                  .transition().duration(200)
                  .attr("stroke-width", 1);
          });

      priceGroup.append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 70)
          .attr("height", 35)
          .attr("fill", appState.viewMode === 'price' ? "#3498db" : "#34495e")
          .attr("stroke", appState.viewMode === 'price' ? "#ecf0f1" : "#7f8c8d")
          .attr("stroke-width", appState.viewMode === 'price' ? 2 : 1)
          .attr("rx", 6);

      priceGroup.append("text")
          .attr("x", 35)
          .attr("y", 15)
          .attr("text-anchor", "middle")
          .attr("fill", "#ecf0f1")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .text("Price");
          
      priceGroup.append("text")
          .attr("x", 35)
          .attr("y", 28)
          .attr("text-anchor", "middle")
          .attr("fill", "#bdc3c7")
          .style("font-size", "9px")
          .text("(USD)");
  }

  document.getElementById("next-btn").addEventListener("click", function() {
      if (appState.isUpdating) {
          console.log('Scene update in progress, please wait...');
          return;
      }
      if (appState.currentScene < scenes.length - 1) {
          updateScene(appState.currentScene + 1);
      }
  });

  document.getElementById("prev-btn").addEventListener("click", function() {
      if (appState.isUpdating) {
          console.log('Scene update in progress, please wait...');
          return;
      }
      if (appState.currentScene > 0) {
          updateScene(appState.currentScene - 1);
      }
  });

})();
