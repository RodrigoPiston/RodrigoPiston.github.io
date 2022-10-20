// To parse this data:
//
//   import { Convert, FlightDataSet } from "./file";
//
//   const flightDataSet = Convert.toFlightDataSet(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface FlightDataSet {
    flightData: FlightData;
}

export interface FlightData {
    names:   any[];
    flights: Flight[];
    meta:    Meta;
}

export interface Flight {
    dep: Arr;
    arr: Arr;
    flt: Flt;
}

export interface Arr {
    airportname:   string;
    cityname:      string;
    countryname:   string;
    airportcode:   string;
    latitude:      string;
    longitude:     string;
    timezone:      string;
    timezoneshort: string;
}

export interface Flt {
    flightNo:            string;
    iatacode:            string;
    name:                string;
    operated_by:         string;
    cabin:               string;
    class:               string;
    aircraft:            string;
    departure:           Arrival;
    arrival:             Arrival;
    transit_time:        TransitTime;
    duration:            Duration;
    distance:            Distance;
    co2:                 { [key: string]: number };
    "svg-logo-high-res": string;
    "png-logo-low-res":  string;
}

export interface Arrival {
    day:    string;
    string: string;
    hr12:   string;
    hr24:   string;
    UTC:    string;
    tz:     string;
}

export interface Distance {
    miles: number;
    km:    number;
}

export interface Duration {
    minutes: string;
    hours:   string;
}

export interface TransitTime {
    minutes?: number;
    hours?:   number;
    days?:    number;
    months?:  number;
}

export interface Meta {
    pnr: null;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toFlightDataSet(json: string): FlightDataSet {
        return cast(JSON.parse(json), r("FlightDataSet"));
    }

    public static flightDataSetToJson(value: FlightDataSet): string {
        return JSON.stringify(uncast(value, r("FlightDataSet")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): any {
    if (typeof typ === 'string') return "";
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "FlightDataSet": o([
        { json: "flightData", js: "flightData", typ: r("FlightData") },
    ], false),
    "FlightData": o([
        { json: "names", js: "names", typ: a("any") },
        { json: "flights", js: "flights", typ: a(r("Flight")) },
        { json: "meta", js: "meta", typ: r("Meta") },
    ], false),
    "Flight": o([
        { json: "dep", js: "dep", typ: r("Arr") },
        { json: "arr", js: "arr", typ: r("Arr") },
        { json: "flt", js: "flt", typ: r("Flt") },
    ], false),
    "Arr": o([
        { json: "airportname", js: "airportname", typ: "" },
        { json: "cityname", js: "cityname", typ: "" },
        { json: "countryname", js: "countryname", typ: "" },
        { json: "airportcode", js: "airportcode", typ: "" },
        { json: "latitude", js: "latitude", typ: "" },
        { json: "longitude", js: "longitude", typ: "" },
        { json: "timezone", js: "timezone", typ: "" },
        { json: "timezoneshort", js: "timezoneshort", typ: "" },
    ], false),
    "Flt": o([
        { json: "flightNo", js: "flightNo", typ: "" },
        { json: "iatacode", js: "iatacode", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "operated_by", js: "operated_by", typ: "" },
        { json: "cabin", js: "cabin", typ: "" },
        { json: "class", js: "class", typ: "" },
        { json: "aircraft", js: "aircraft", typ: "" },
        { json: "departure", js: "departure", typ: r("Arrival") },
        { json: "arrival", js: "arrival", typ: r("Arrival") },
        { json: "transit_time", js: "transit_time", typ: r("TransitTime") },
        { json: "duration", js: "duration", typ: r("Duration") },
        { json: "distance", js: "distance", typ: r("Distance") },
        { json: "co2", js: "co2", typ: m(3.14) },
        { json: "svg-logo-high-res", js: "svg-logo-high-res", typ: "" },
        { json: "png-logo-low-res", js: "png-logo-low-res", typ: "" },
    ], false),
    "Arrival": o([
        { json: "day", js: "day", typ: "" },
        { json: "string", js: "string", typ: "" },
        { json: "hr12", js: "hr12", typ: "" },
        { json: "hr24", js: "hr24", typ: "" },
        { json: "UTC", js: "UTC", typ: "" },
        { json: "tz", js: "tz", typ: "" },
    ], false),
    "Distance": o([
        { json: "miles", js: "miles", typ: 0 },
        { json: "km", js: "km", typ: 0 },
    ], false),
    "Duration": o([
        { json: "minutes", js: "minutes", typ: "" },
        { json: "hours", js: "hours", typ: "" },
    ], false),
    "TransitTime": o([
        { json: "minutes", js: "minutes", typ: u(undefined, 0) },
        { json: "hours", js: "hours", typ: u(undefined, 0) },
        { json: "days", js: "days", typ: u(undefined, 0) },
        { json: "months", js: "months", typ: u(undefined, 0) },
    ], false),
    "Meta": o([
        { json: "pnr", js: "pnr", typ: null },
    ], false),
};
