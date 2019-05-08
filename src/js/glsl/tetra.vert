#pragma glslify: snoise = require(glsl-noise/simplex/4d)

uniform float uTime;

void main() {
	vec3 transformed = vec3( position );
    transformed += snoise(vec4(transformed*3.0, (uTime * 0.005))) * 0.015;
	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
	gl_Position = projectionMatrix * mvPosition;
}