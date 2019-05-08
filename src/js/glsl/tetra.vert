#pragma glslify: snoise = require(glsl-noise/simplex/4d)

uniform float uTime;

#include <common>

void main() {

	#include <begin_vertex>

    transformed += snoise(vec4(transformed*3.0, (uTime * 0.005))) * 0.015;

	#include <project_vertex>
	#include <worldpos_vertex>

}