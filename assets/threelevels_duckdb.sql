-- wget https://www2.census.gov/geo/tiger/TIGER2025/COUNTY/tl_2025_us_county.zip
-- wget https://www2.census.gov/geo/tiger/TIGER2025/EDGES/tl_2025_01001_edges.zip
-- unzip '*.zip'
-- duckdb threelevels.duckdb



-- load shapefiles
drop table if exists roads;
create table roads as (
  select * exclude(geom),st_transform(geom,'EPSG:4326','EPSG:3857',true) geom
  from st_read('tl_2025_01001_edges.shp')
  where left(mtfcc,1)='S'
);
drop table if exists county;
create table county as (
  select * exclude(geom),st_transform(geom,'EPSG:4326','EPSG:3857',true) geom
  from st_read('tl_2025_us_county.shp')
  where geoid='01001'
);



-- create some random points
drop table if exists points;
create table points as
select row_number() over (order by geom_point) id
  ,t.geom_point geom
from (
    select st_point(
            ST_XMin(c.geom) + (ST_XMax(c.geom) - ST_XMin(c.geom)) * random(),
            ST_YMin(c.geom) + (ST_YMax(c.geom) - ST_YMin(c.geom)) * random()
        ) geom_point
        ,c.geom geom_polygon
    from county c,generate_series(1, 10000)
) t
where st_intersects(geom_point, geom_polygon)=true;