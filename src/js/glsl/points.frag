uniform vec3 diffuse;
uniform float opacity;
uniform float uTime;

float circle(in float dist, in float radius) {
	return 1.0 - smoothstep(
		radius - (radius * 2.0),
		radius + (radius * 0.00001),
        dot(dist, dist) * 4.0
	);
}


#include <common>
#include <color_pars_fragment>
// #include <map_particle_pars_fragment>
uniform sampler2D map;
varying vec2 vUv;
uniform mat3 uvTransform;
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );

	#include <logdepthbuf_fragment>
	// #include <map_particle_fragment>
	vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;

	vec2 pos = uv;
	pos -= 0.5;

	float dist = length(pos);

	vec3 color = vec3(circle(dist, 0.9));
	color *= sin((dist * 100.0) - (uTime * 0.05));

	gl_FragColor = vec4( color, 0.03 );

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>

}