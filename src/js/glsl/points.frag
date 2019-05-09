uniform float uTime;
uniform float uFreq;

float circle(in float dist, in float radius) {
	return 1.0 - smoothstep(
		radius - (radius * 2.0),
		radius + (radius * 0.00001),
        dot(dist, dist) * 4.0
	);
}

void main() {
	vec2 uv =  vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y ) - 0.5;
	float dist = length(uv);
	vec3 color = vec3(circle(dist, 0.9));
	color *= sin((dist * 100.0) - (uTime * 0.05));
	gl_FragColor = vec4( color, clamp(uFreq, 0.0, 0.03) );
}