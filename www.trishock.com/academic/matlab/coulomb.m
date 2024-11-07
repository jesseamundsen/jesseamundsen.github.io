function [c, m, phi] = coulomb(s3a, s1a, s3b, s1b)
% Sep 8, 2008
% Jesse Amundsen
%
% Purpose: Program accepts 2 sets of
%          s3/s1 (a,b) and calculates
%          the y-intercept (cohesion)
%          and the slope (angle of internal
%          friction)


% Temporary values
%s3a = 1;
%s1a = 3;
%s3b = 4;
%s1b = 8;


% Use the format for a circle
%  (x-a)^2+(y-b)^2=r^2
%  b will always be zero, a will
%  be s3 + .5(s1-s3)
a_a = s3a + (1/2)*(s1a - s3a);
a_b = s3b + (1/2)*(s1b - s3b);


%  r will be .5(s1-s3)
r_a = (1/2)*(s1a - s3a);
r_b = (1/2)*(s1b - s3b);


%  put the equation together
syms xf;
syms xg;


% equation f(x)
fxf = sqrt(r_a^2 - (xf - a_a)^2);


% equation g(x)
gxg = sqrt(r_b^2 - (xg - a_b)^2);


% Differentiate each equation
%  and solve for x_a (xf) and x_b (xg)
fxfp = diff(fxf);
gxgp = diff(gxg);
[xge] = solve(fxfp - gxgp, xg);


% fxfp = (gxg - fxf)/(xg - xf);
gxg2 = subs(gxg, xg, xge(1));


% solve for xf; pt = point of tangency

%  Uses solve() function in symbolilc math toolbox
%pt = solve(fxfp - (gxg2 - fxf)/(xge(1) - xf),xf);

%  These use the intersections function, will also work
x1 = s3a:.01:(s3a+((s1a-s3a)*.5)); % Accuracy controls results
y1 = subs(fxfp, xf, x1);
y2 = subs((gxg2 - fxf)/(xge(1) - xf), xf, x1);
pt = intersections(x1, y1, x1, y2, true);


% Calculate slope of line:
%  put pt into xf in fxfp
m = subs(fxfp, xf, pt(1));


%  point of tangency: at pt in fxf what is
%   intercept
pty = subs(fxf, xf, pt(1));


%  create equation of line using
%   (pt,pty)=(h,k) with m as slope
%   in form y-k=m(x-h)
syms x;
y = m * (x - pt) + pty;


%  calculate cohesion c = (y-intercept)
c = simplify(subs(y, x, 0));


%  calculate phi (angle of internal friction)
phical = subs(y, x, 2);
phi = asin((phical-c)/2)*180/pi;