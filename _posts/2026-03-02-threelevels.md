---
layout: post
title:  "My Three Levels of Abstraction"
date:   2026-03-02 10:03:00 -0500
tags: software thinking abstraction duckdb spatial
---

I tell people that I am a software developer, but that's not what I really do. I'm a problem solver that sometimes has to use code to solve problems I am faced with. When I was only a few years into my career, my boss once referred to me as a "hacker”, and I found a great truth in the term. My job wasn't to package and sell applications to users, it was to hack away and eventually solve complex problems involving spatial data and network routing. As I matured as a problem solver, I came to identify three different levels of abstraction.

_For context, consider a request for some processing in a spatial database on data representing a collection of points and roads. To join along or understand further, reference the [MTFCC Classifications](https://www2.census.gov/geo/pdfs/reference/mtfccs2025.pdf) and an [SQL script](/assets/threelevels_duckdb.sql) tailored for [DuckDB](https://duckdb.org)._
1. _How many points are within 100m of a primary road?_
2. _How many points are within 100m of a secondary road?_



<br/>
### Level 1: Solves one known problem

In the first level, abstraction is nearly non-existent. We write two queries, one to answer each request. Our solution doesn't provide the ability to answer any questions beyond the identified requests. These types of solutions lack reusability and are more likely to be redundant with other solutions created in the past and future. They only require knowledge of the task at hand.

```sql
select count(distinct p.id) Count
from points p
join roads r on st_dwithin(p.geom,r.geom,100)=true
where r.mtfcc='S1100';
```
<p>
<table><tr><th>Count</th></tr><tr><td>26</td></tr></table>
</p>

```sql
select count(distinct p.id) Count
from points p
join roads r on st_dwithin(p.geom,r.geom,100)=true
where r.mtfcc='S1200';
```
<p>
<table><tr><th>Count</th></tr><tr><td>107</td></tr></table>
</p>


<br/>
### Level 2: Solves multiple known problems

Instead of answering each request independently, we create a solution that can answer both requests. As a bonus, we reveal additional information as we can now see the distribution of nearest road types for _any point_ within 100m. This depended on the fact that we had knowledge of more than one request. When working in teams or organizations, effective communication becomes increasingly important at this level. It's easier to create solutions for known problems than unknown ones.

```sql
select mtfcc Classification
  ,count(distinct p.id) Count
from points p
join roads r on st_dwithin(p.geom,r.geom,100)=true
group by 1
order by 1;
```
<p>
<table><tr><th>Classification</th><th>Count</th></tr>
<tr><td>S1100</td><td>26</td></tr>
<tr><td>S1200</td><td>107</td></tr>
<tr><td>S1400</td><td>1182</td></tr>
<tr><td>S1500</td><td>2</td></tr>
<tr><td>S1630</td><td>3</td></tr>
<tr><td>S1640</td><td>2</td></tr>
<tr><td>S1710</td><td>1</td></tr>
<tr><td>S1750</td><td>8</td></tr>
</table>
</p>


<br/>
### Level 3: Solves multiple known and unknown problems

At this level, we are predicting and anticipating the future. We ask ourselves what requests will come next and what other questions we can answer. We don't just answer the things we know have been asked of us, we explore further. The solution we create is capable of answering multiple known and _unknown_ questions. We elect to create a new data set that provides the closest `road_id` for every `point_id` regardless of distance.

```sql
drop table if exists points_all;
create table points_all as
with recursive nn as (
  select id point_id
    ,null::int road_id
    ,geom
    ,1 n
  from points
  union
  select p.point_id
    ,r.tlid road_id
    ,p.geom
    ,p.n + 1
  from (
    select * 
    from nn 
    where road_id is null
  ) p
  left join roads r on st_dwithin(p.geom, r.geom, 100*p.n)
)
select distinct on (point_id) point_id
  ,road_id
  ,mtfcc classification
  ,st_distance(nn.geom, r.geom) distancem
from nn
join roads r on r.tlid=nn.road_id
where road_id is not null
order by point_id, distancem;
```
<p>
<table><tr><th>point_id</th><th>road_id</th><th>classification</th><th>distancem</th></tr>
<tr><td>1</td><td>647157989</td><td>S1400</td><td>826.0732468995094</td></tr>
<tr><td>2</td><td>2828553</td><td>S1400</td><td>420.80429160397244</td></tr>
<tr><td>3</td><td>2822803</td><td>S1400</td><td>138.23585861539044</td></tr>
<tr><td>4</td><td>2825668</td><td>S1400</td><td>207.97482230400536</td></tr>
<tr><td>5</td><td>2840003</td><td>S1400</td><td>70.72361199647597</td></tr>
</table>
</p>

Consider how much more we can now answer with our derivative table `points_all` showing _every relationship_, regardless of road classification _or_ distance.

* How many points are within 200m of any road? Further than 1km?
* Statistics like average, percentiles, and more can be determined.
* We can bin the results into distance bands (0-10m, 10-25m, 25-50m, etc.) for all roads or by classification.

<br/>
### Simple example, but with big implications

The example provided is simple. The implications are large. What if our data set was hundreds of millions of points? If we aproach with the mindset of level 1, each query may run for hours before returning a result. If subsequent requests are made to determine the count of points for different distances or classifications, the solution will, again, be hours away. With the knowledge of more information we get in level 2 or level 3, we may choose to ask different questions.

The provided example uses a spatial data analysis task, but the same principles can be applied to software development. The lessons are clear: Work with a more expansive understanding of the problems you are solving while focusing on building tools and capabilities rather than just generating one off answers.