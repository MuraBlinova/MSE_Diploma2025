/**
 * @author jbouny / https://github.com/fft-ocean
 */

var DEMO =
{
	ms_Renderer : null,
	ms_Camera : null,
	ms_Scene : null,
	ms_Controls : null,
	ms_Ocean : null,
	ms_Environment : "night",

	ms_Commands : {
		states : {
			up : false,
			right : false,
			down : false,
			left : false
		},
		movements : {
			speed : 0.0,
			angle : 0.0
		}
	},

	heightMapPlane : false,
	normalMapPlane : false,
	showDebugNormalMap: false,
	debugNormalMapMesh: null,

	Initialize : function () {

		this.ms_Renderer = new THREE.WebGLRenderer();
		this.ms_Renderer.context.getExtension( 'OES_texture_float' );
		this.ms_Renderer.context.getExtension( 'OES_texture_float_linear' );
		this.ms_Renderer.setClearColor( 0x000000 );

		document.body.appendChild( this.ms_Renderer.domElement );

		this.ms_Scene = new THREE.Scene();

		this.ms_GroupShip = new THREE.Object3D();
		this.ms_BlackPearlShip = new THREE.Object3D();
		this.ms_Scene.add( this.ms_GroupShip );
		this.ms_GroupShip.add( this.ms_BlackPearlShip );

		this.ms_Camera = new THREE.PerspectiveCamera( 55.0, WINDOW.ms_Width / WINDOW.ms_Height, 0.5, 1000000 );
		this.ms_Camera.position.set( 0, 350, 800 );
		this.ms_Camera.lookAt( new THREE.Vector3() );
		this.ms_BlackPearlShip.add( this.ms_Camera );

		// Initialize Orbit control
		this.ms_Controls = new THREE.OrbitControls( this.ms_Camera, this.ms_Renderer.domElement );
		this.ms_Controls.userPan = false;
		this.ms_Controls.target.set( 0, 100.0, 0 );
		this.ms_Controls.noKeys = true;
		this.ms_Controls.userPanSpeed = 0;
		this.ms_Controls.minDistance = 0;
		this.ms_Controls.maxDistance = 20000.0;
		this.ms_Controls.minPolarAngle = 0;
		this.ms_Controls.maxPolarAngle = Math.PI * 0.75;

		this.InitializeLoader();
		this.InitializeScene();

		this.InitGui();
		this.InitCommands();

	},
	
	InitializeLoader : function InitializeLoader() {
	
		this.ms_Loader = new THREE.LoadingManager();
		
		var log = function( message, type, timeout ) {
			console.log( message );
			// messg( message, type, timeout );
		}
		
		var delay = 1500;
		this.ms_Loader.onProgress = function( item, loaded, total ) {
			log( 'Loaded ' + loaded + '/' + total + ':' + item, 'info', delay );
		};
		this.ms_Loader.onLoad = function () {
			log( 'Loaded.', 'success', delay );
		};
		this.ms_Loader.onError = function () {
			log( 'Loading error.', 'error', delay );
		};
		
		
		this.ms_ImageLoader = new THREE.ImageLoader( this.ms_Loader );
	
	},

	InitializeScene : function InitializeScene() {

		// Add light
		this.ms_MainDirectionalLight = new THREE.DirectionalLight( 0xffffff, 1.5 );
		this.ms_MainDirectionalLight.position.set( -0.2, 0.5, 1 );
		this.ms_Scene.add( this.ms_MainDirectionalLight );

		// Initialize Clouds
		this.ms_CloudShader = new CloudShader( this.ms_Renderer, 512 );
		this.ms_CloudShader.cloudMesh.scale.multiplyScalar( 4.0 );
		this.ms_Scene.add( this.ms_CloudShader.cloudMesh );

		// Initialize Ocean
		var gsize = 512;
		var res = 512;
		var gres = 256;
		var origx = -gsize / 2;
		var origz = -gsize / 2;
		this.ms_Ocean = new THREE.Ocean( this.ms_Renderer, this.ms_Camera, this.ms_Scene,
		{
			INITIAL_SIZE : 200.0,
			INITIAL_WIND : [ 10.0, 10.0 ],
			INITIAL_CHOPPINESS : 3.6,
			CLEAR_COLOR : [ 1.0, 1.0, 1.0, 0.0 ],
			SUN_DIRECTION : this.ms_MainDirectionalLight.position.clone(),
			OCEAN_COLOR: new THREE.Vector3( 0.35, 0.4, 0.45 ),
			SKY_COLOR: new THREE.Vector3( 10.0, 13.0, 15.0 ),
			EXPOSURE : 0.15,
			GEOMETRY_RESOLUTION: gres,
			GEOMETRY_SIZE : gsize,
			RESOLUTION : res
		} );

		// --- Debug normal map mesh ---
		var debugNormalGeometry = new THREE.PlaneBufferGeometry(gsize, gsize, gres, gres);
		var debugNormalMaterial = new THREE.ShaderMaterial({
			uniforms: {
				normalMap: { value: this.ms_Ocean.normalMapFramebuffer.texture }
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform sampler2D normalMap;
				varying vec2 vUv;
				void main() {
					vec3 normal = texture2D(normalMap, vUv).xyz;
					normal = normal * 0.5 + 0.5;
					gl_FragColor = vec4(normal, 0.7);
				}
			`,
			transparent: false,
			opacity: 1.0
		});
		this.debugNormalMapMesh = new THREE.Mesh(debugNormalGeometry, debugNormalMaterial);
		this.debugNormalMapMesh.position.set(0, 30, 0);
		this.debugNormalMapMesh.rotation.x = -Math.PI / 2;
		this.debugNormalMapMesh.visible = false;
		this.ms_Scene.add(this.debugNormalMapMesh);

		this.LoadSkyBox();
	},

	InitGui : function InitGui() {

		// Initialize UI
		var gui = new dat.GUI();
		// dat.GUI.toggleHide();

		gui.add( this.ms_Ocean, "size", 10, 2000 ).onChange( function( v ) {
			this.object.size = v;
			this.object.changed = true;
		} );
		gui.add( this.ms_Ocean.materialSpectrum.uniforms.u_choppiness, "value", 0.1, 8 ).name( "choppiness" );
		gui.add( this.ms_Ocean, "windX", -50, 50 ).onChange( function ( v ) {
			this.object.windX = v;
			this.object.changed = true;
		} );
		gui.add( this.ms_Ocean, "windY", -50, 50 ).onChange( function ( v ) {
			this.object.windY = v;
			this.object.changed = true;
		} );
		// gui.add( this.ms_Ocean, "exposure", 0.0, 0.5 ).onChange( function ( v ) {
		// 	this.object.exposure = v;
		// 	this.object.changed = true;
		// } );
		// gui.add( DEMO.ms_Ocean.materialOcean, "wireframe" );
		
		gui.add(this, 'showDebugNormalMap').name('Show Normal Map');


		var demo = this;

		$( '#env-selector > ul > li[key="' + this.ms_Environment + '"]' ).addClass( 'selected' );
		$( '#env-selector > ul > li' ).click( function() {
			demo.UpdateEnvironment( $( this ).attr('key') );

			$( '#env-selector > ul > li' ).removeClass( 'selected' );
			$( this ).addClass( 'selected' );
		} ).each( function() {
			$( this ).html( '<a href="#' + $( this ).attr('key') + '">' + $( this ).html() + '</a>' );
		} ) ;

	},

	InitCommands : function InitCommands() {

		var LEFT = 37,
			UP = 38,
			RIGHT = 39,
			DOWN = 40;

		var keyHandler = function keyHandler( action ) {
			return function( event ) {
				var key = event.which;
				if( key >= LEFT && key <= DOWN ) {
					switch( key ) {
						case UP : DEMO.ms_Commands.states.up = action ; break ;
						case RIGHT : DEMO.ms_Commands.states.right = action ; break ;
						case DOWN : DEMO.ms_Commands.states.down = action ; break ;
						case LEFT : DEMO.ms_Commands.states.left = action ; break ;
					}
				}
			}
		}

		$( document ).keydown( keyHandler( true ) );
		$( document ).keyup( keyHandler( false ) );

	},

	LoadSkyBox : function LoadSkyBox() {

		var cubeShader = THREE.ShaderLib['cube'];

		var skyBoxMaterial = new THREE.ShaderMaterial( {
			fragmentShader: cubeShader.fragmentShader,
			vertexShader: cubeShader.vertexShader,
			uniforms: cubeShader.uniforms,
			side: THREE.BackSide
		} );

		this.ms_SkyBox = new THREE.Mesh(
			new THREE.BoxGeometry( 450000, 450000, 450000 ),
			skyBoxMaterial
		);

		this.ms_Scene.add( this.ms_SkyBox );

		// https://stackoverflow.com/questions/3552944/how-to-get-the-anchor-from-the-url-using-jquery
		var url = window.location.href, idx = url.indexOf("#");
		var anchor = idx != -1 ? url.substring(idx+1) : null;
		var environmentParameter = anchor;

		if( environmentParameter !== null ) {
			this.ms_Environment = environmentParameter;
		}

		this.UpdateEnvironment( this.ms_Environment );

	},

	UpdateEnvironment : function UpdateEnvironment( key ) {

		var textureName = '';
		var textureExt = ".jpg";
		var directionalLightPosition = null;
		var directionalLightColor = null;

		textureName = 'sky';
		directionalLightPosition = new THREE.Vector3( -0.5, 0.5, -0.6 );
		directionalLightColor = new THREE.Color( 1, 0.95, 0.9 );

		this.ms_Environment = key;
		this.ms_MainDirectionalLight.position.copy( directionalLightPosition );
		this.ms_MainDirectionalLight.color.copy( directionalLightColor );
		this.ms_Ocean.materialOcean.uniforms.u_sunDirection.value.copy( this.ms_MainDirectionalLight.position );
		
		var sources = [
			'img/' + textureName + '_west' + textureExt,
			'img/' + textureName + '_east' + textureExt,
			'img/' + textureName + '_up' + textureExt,
			'img/' + textureName + '_down' + textureExt,
			'img/' + textureName + '_south' + textureExt,
			'img/' + textureName + '_north' + textureExt
		];
		var images = [];

		var cubeMap = new THREE.CubeTexture( images );
		cubeMap.flipY = false;

		var imageLoader = this.ms_ImageLoader;
		var loaded = 0;
		var loadTexture = function ( i ) {
			imageLoader.load( sources[ i ], function ( image ) {
				cubeMap.images[ i ] = image;
				loaded ++;
				if ( loaded === 6 ) {
					cubeMap.needsUpdate = true;
				}
			} );

		}

		for ( var i = 0, il = sources.length; i < il; ++ i ) {
			loadTexture( i );
		}
		
		cubeMap.format = THREE.RGBFormat;
		cubeMap.generateMipmaps = false;
		cubeMap.magFilter = THREE.LinearFilter;
		cubeMap.minFilter = THREE.LinearFilter;

		this.ms_SkyBox.material.uniforms['tCube'].value = cubeMap;
	},

	Display : function () {

		this.ms_Renderer.render( this.ms_Scene, this.ms_Camera );

	},

	Update : function () {

		// Update camera position
		if( this.ms_Camera.position.y < 0.0 ) {
			this.ms_Camera.position.y = 2.0;
		}

		var currentTime = new Date().getTime();
		this.ms_Ocean.deltaTime = ( currentTime - lastTime ) / 1000 || 0.0;
		lastTime = currentTime;

		// Render ocean reflection
		this.ms_Camera.remove( this.ms_Rain );
		this.ms_Ocean.render();

		// Updade clouds
		this.ms_CloudShader.update();

		// Update ocean data
		this.ms_Ocean.update();

		// Update normal map
		if (this.debugNormalMapMesh) {
			this.debugNormalMapMesh.material.uniforms.normalMap.value = this.ms_Ocean.normalMapFramebuffer.texture;
			this.debugNormalMapMesh.visible = this.showDebugNormalMap;
		}
		
		this.ms_Controls.update();
		this.Display();

	},

	UpdateCommands : function UpdateCommands() {

		var states = this.ms_Commands.states;

		// Update speed
		var targetSpeed = 0.0;
		if( states.up ) {
			targetSpeed = 1.0;
		}
		else if( states.down ) {
			targetSpeed = -0.5;
		}
		var curSpeed = this.ms_Commands.movements.speed ;
		this.ms_Commands.movements.speed = curSpeed + ( targetSpeed - curSpeed ) * 0.02;

		// Update angle
		var targetAngle = 0.0;
		if( states.left ) {
			targetAngle = Math.PI * 0.005;
		}
		else if( states.right ) {
			targetAngle = -Math.PI * 0.005;
		}
		if( states.down ) {
			targetAngle *= -1.0;
		}
		
		var curAngle = this.ms_Commands.movements.angle ;
		this.ms_Commands.movements.angle = curAngle + ( targetAngle - curAngle ) * 0.02;

	},

	Resize : function ( inWidth, inHeight ) {

		this.ms_Camera.aspect = inWidth / inHeight;
		this.ms_Camera.updateProjectionMatrix();
		this.ms_Renderer.setSize( inWidth, inHeight );
		this.Display();

	}
};
