uniform vec3 diffuse;
uniform float uFreq;

void main() {
	gl_FragColor = vec4( diffuse, clamp(uFreq, 0.0, 0.4) );
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
}