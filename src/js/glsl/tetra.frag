uniform vec3 diffuse;
uniform float opacity;
uniform float uFreq;

#include <common>

void main() {

	vec4 diffuseColor = vec4( diffuse, opacity );

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	reflectedLight.indirectDiffuse += vec3( 1.0 );
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;

	vec3 outgoingLight = reflectedLight.indirectDiffuse;

	gl_FragColor = vec4( outgoingLight, clamp(uFreq, 0.0, 0.2) );

	#include <tonemapping_fragment>

}