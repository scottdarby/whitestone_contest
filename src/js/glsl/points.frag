uniform vec3 diffuse;
uniform float opacity;
uniform float uTime;
uniform sampler2D map;
varying vec2 vUv;
uniform mat3 uvTransform;
uniform float uFreq;

float circle(in float dist, in float radius) {
	return 1.0 - smoothstep(
		radius - (radius * 2.0),
		radius + (radius * 0.00001),
        dot(dist, dist) * 4.0
	);
}

#include <common>

void main() {

	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );

	vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;

	vec2 pos = uv;
	pos -= 0.5;

	float dist = length(pos);

	vec3 color = vec3(circle(dist, 0.9));
	color *= sin((dist * 100.0) - (uTime * 0.05));

	gl_FragColor = vec4( color, clamp(uFreq, 0.0, 0.03) );

	#include <tonemapping_fragment>

}