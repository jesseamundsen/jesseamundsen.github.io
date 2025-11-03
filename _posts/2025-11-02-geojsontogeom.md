---
layout: post
title:  "Dealing with GeoJSON feature collections in PostGIS"
date:   2025-11-02 21:06:00 -0500
tags: postgis postgresql
---

One task I have come across repeatedly while building APIs or functions that accept GeoJSON is dealing with differing representations. The input data may be a geometry, a feature, or a feature collection. When utilizing PostGIS as a backend, I inevitably run into errors after naively using the `ST_GeomFromGeoJSON()` function directly to convert the input data into a PostGIS geometry:

```
[XX000] ERROR: invalid GeoJson representation
```

Since the `ST_GeomFromGeoJSON()` function only operates on geometries, any input data represented as a feature or a feature collection will lead to this error.

To deal with this more rigorously, the JSON functions found in PostgreSQL can be utilized in a function that consistently provides data back as a table with PostGIS geometry objects.

There are three representations of GeoJSON data to account for.

1. Feature collections can contain multiple features, each with a geometry and associated properties. This is the full example below.
2. Features represent a single geometry but can preserve properties. A single feature would be a single object from the `features` array in the example below.
3. Geometries are only the geometry object itself. The geometry in the example below is the `geometry` object which defines coordinates and a type, but no additional properties.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          [
            [
              -117.64357831688176,
              46.70981365574963
            ],
            [
              -117.64357831688176,
              45.01441557906168
            ],
            [
              -114.88052636647359,
              45.01441557906168
            ],
            [
              -114.88052636647359,
              46.70981365574963
            ],
            [
              -117.64357831688176,
              46.70981365574963
            ]
          ]
        ],
        "type": "Polygon"
      }
    }
  ]
}
```

Constructing a function that handles these three representations and provides back a standardized table of data complete with a PostGIS geometry is relatively straightforward.

```sql
drop function if exists public.geojsontogeom;
create function public.geojsontogeom(geojson jsonb)
returns table (featuretype text, geometrytype text, properties jsonb, geom geometry)
language plpgsql
as $function$
declare
    type text;
begin

    drop table if exists features;
    create temp table features
    (featuretype text, geometrytype text, properties jsonb, geom geometry);

    type = (select lower(geojson ->> 'type'));

    if type = 'featurecollection' then
        insert into features
        select f.features ->> 'type' featuretype
            ,f.features -> 'geometry' ->> 'type' geometrytype
            ,f.features -> 'properties' properties
            ,st_setsrid(st_geomfromgeojson(f.features ->> 'geometry'),4326) geometry
        from (
            select jsonb_array_elements(geojson -> 'features') features
        ) f;
    elsif type = 'feature' then
        insert into features
        select f.features ->> 'type' featuretype
            ,f.features -> 'geometry' ->> 'type' geometrytype
            ,f.features -> 'properties' properties
            ,st_setsrid(st_geomfromgeojson(f.features ->> 'geometry'),4326) geometry
        from (
            select geojson features
        ) f;
    else
        insert into features
        select null featuretype
            ,f.features ->> 'type' geometrytype
            ,null
            ,st_setsrid(st_geomfromgeojson(f.features),4326) geometry
        from (
            select geojson features
        ) f;
    end if;

    return query select * from features;

end
$function$;
```

The function will accept all three formats and can be called like a table:

```sql
select * from public.geojsontogeom('<geojson>');
```

When a feature collection contains multiple features, they will be represented as rows in the results:

| featuretype | geometrytype | properties | geometry |
| :--- | :--- | :--- | :--- |
| Feature | Polygon | {} | POLYGON\(\(-117.643578... |
| Feature | Polygon | {} | POLYGON\(\(-113.997757... |
| Feature | LineString | {} | LINESTRING\(-112.2041... |

<br/>

## The Inverse

If you have a table of geometry data and want to represent it as a feature collection, you can construct the appropriate GeoJSON using the built in JSON functions of PostgreSQL:

```sql
select jsonb_build_object('type','FeatureCollection',
    'features',jsonb_agg(features)) geojson
from (
    select 'Feature' type
        ,to_jsonb(t) - 'geom' properties
        ,st_asgeojson(t.geom)::jsonb geometry
    from public.twogeoms t
) features;
```