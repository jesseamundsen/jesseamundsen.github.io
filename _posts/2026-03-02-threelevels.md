---
layout: post
title:  "My Three Levels of Abstraction"
date:   2026-03-02 10:03:00 -0500
tags: software thinking abstraction duckdb spatial
---

I tell people that I am a software developer, but that's not what I really do. I'm a problem solver that sometimes has to use code to solve problems I am faced with. When I was only a few years into my career, my boss once referred to me as a "hacker”, and I found a great truth in the term. My job wasn't to package and sell applications to users, it was to hack away and eventually solve complex problems involving spatial data and network routing. As I matured as a problem solver, I came to identify three different levels of abstraction.

_For context, consider a the following two questions relating to some spatial data representing a collection of points and roads. To join along or understand further, reference the [MTFCC Classifications](https://www2.census.gov/geo/pdfs/reference/mtfccs2025.pdf) and an [SQL script](/assets/threelevels_duckdb.sql) tailored for [DuckDB](https://duckdb.org)._
1. _How many points are within 100m of a primary road (S1100)?_
2. _What is the average distance of points that are within 50m of a secondary road (S1200)?_



<br/>
### Level 1: Solves one known problem

In the first level, abstraction is nearly non-existent. We write two queries, one to answer each question. Our solution doesn't provide the ability to answer any questions beyond those already defined. These types of solutions lack reusability and are more likely to be redundant with other solutions created in the past and future.

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
select avg(t.distancem) Average50m
from (
  select distinct on (p.id)
    st_distance(p.geom,r.geom) distancem
  from points p
  join roads r on st_dwithin(p.geom,r.geom,50)=true
  where r.mtfcc='S1200'
  order by 1
) t;
```
<p>
<table><tr><th>Average50m</th></tr><tr><td>20.890220890606937</td></tr></table>
</p>


<br/>
### Level 2: Solves multiple known problems

Instead of answering each request independently, we create a solution that can answer both requests. This depended on the fact that we had knowledge of more than one request. When working in teams or organizations, effective communication becomes increasingly important at this level. It's easier to create solutions for known problems than unknown ones.

```sql
select t.mtfcc Classification
  ,count(*) Count
  ,avg(case when t.distancem<50 then t.distancem else null end) Average50m
from (
  select distinct on (p.id,r.mtfcc)
    st_distance(p.geom,r.geom) distancem
    ,r.mtfcc
  from points p
  join roads r on st_dwithin(p.geom,r.geom,100)=true
  where r.mtfcc in ('S1100','S1200')
  order by 1
) t
group by 1
order by 1;
```
<p>
<table><tr><th>Classification</th><th>Count</th><th>Average50m</th></tr>
<tr><td>S1100</td><td>26</td><td>16.55423319992319</td></tr>
<tr><td>S1200</td><td>107</td><td>20.890220890606937</td></tr>
</table>
</p>


<br/>
### Level 3: Solves multiple known and unknown problems

At this level, we are predicting and anticipating the future. We ask ourselves what requests will come next and what other information we can discover. We don't just answer the things that have been asked of us, we explore further. The solution we create is capable of answering multiple known and _unknown_ questions. We elect to create a new data set that provides the closest `road_id` for every `point_id` regardless of distance or classification.

```sql
drop table if exists points_all;
create table points_all as
select distinct on (p.id)
   p.id point_id
  ,r.tlid road_id
  ,r.mtfcc classification
  ,st_distance(p.geom,r.geom) distancem
from points p,roads r
order by 1,4;

select 1 question
  ,count(*) answer
from points_all
where classification='S1100' and distancem<100
union all
select 2 question
  ,avg(distancem) answer
from points_all
where classification='S1200' and distancem<50;
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

<p>
<table><tr><th>question</th><th>answer</th></tr>
<tr><td>1</td><td>25</td></tr>
<tr><td>2</td><td>20.805651780746526</td></tr>
</table>
</p>

At this point we ask ourselves "Why are the answers different? Are either or both of my analyses flawed?". By creating our unified solution we have revealed something that escaped us before. Why do the answers differ? The solutions in level 1 and 2 did not care if a given road with a classification was the _closest_ road to a given point, only if the point was within the tolerance of the spatial join. Our answers differ because they are answering different questions. We have more information now, and can provide more context around the results as well as confirm or alter the task to match the expectations of whoever requested the analysis. Did they actually want the analysis done using a nearest neighbor or not?

Regardless, consider how much more we can now answer with our `points_all` table showing _every relationship_, regardless of road classification _or_ distance.

* How many points are within 200m of any road? Further than 1km?
* Statistics like average, percentiles, and more can be determined.
* We can bin the results into distance bands (0-10m, 10-25m, 25-50m, etc.) for all roads or by classification.

<br/>
### Simple example, but with big implications

The example provided is simple. The implications are large. What if our data set was hundreds of millions of points? If we aproach with the mindset of level 1 or 2, each query may run for hours before returning a result. All of the detailed information about how the points relate to the roads is lost. If subsequent requests are made to determine the count of points for different distances or classifications, the solution will, again, be hours away. Using the additional information we have from the approach in level 3, we may choose to ask different questions in the future or not have to ask new ones at all.

The provided example uses a spatial data analysis task, but the same principles can be applied to software development. The lessons are clear: Work with a more expansive understanding of the problems you are solving while focusing on building tools and capabilities rather than just generating one off solutions.