#pragma glslify: snoise = require(glsl-noise/simplex/4d)

uniform float uTime;
uniform float size;
uniform float scale;

void main() {
	vec3 transformed = vec3( position );
    transformed += snoise(vec4(transformed*3.0, (uTime * 0.002))) * 0.015;
	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
	gl_Position = projectionMatrix * mvPosition;
	gl_PointSize = size;
	gl_PointSize *= ( scale / - mvPosition.z );
	gl_PointSize *= clamp(length(transformed) * 2.0, 0.0, 3.0);
}