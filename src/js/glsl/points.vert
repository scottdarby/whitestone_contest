#pragma glslify: snoise = require(glsl-noise/simplex/4d)

uniform float uTime;
uniform float size;
uniform float scale;

#include <common>

void main() {

	#include <begin_vertex>

    transformed += snoise(vec4(transformed*3.0, (uTime * 0.005))) * 0.015;

	#include <project_vertex>

	gl_PointSize = size;

	bool isPerspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 );

	if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );

	gl_PointSize *= clamp(length(transformed) * 2.0, 0.0, 3.0);

	#include <worldpos_vertex>

}