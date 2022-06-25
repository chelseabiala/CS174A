import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class Assignment4 extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        this.shapes = {
            box_1: new Cube(),
            box_2: new Cube(),
            axis: new Axis_Arrows()
        }
        console.log(this.shapes.box_1.arrays.texture_coord)

        // Displays textures four times

        this.shapes.box_2.arrays.texture_coord.forEach(v => v.scale_by(2));

        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            cube1: new Material(new Texture_Rotate(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/stars.png", "NEAREST")
            }),
            cube2: new Material(new Texture_Scroll_X(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/earth.gif", "LINEAR_MIPMAP_LINEAR")
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
        this.spinning = false;
        this.box_1_transform = Mat4.translation(-2,0,0);
        this.box_2_transform = Mat4.translation(2,0,0);
    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("Cube rotation", ["c"], () => this.spinning = !this.spinning);
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        if (this.spinning) {
            this.box_1_transform = this.box_1_transform.times( Mat4.rotation(Math.PI * dt * 2/3, 1, 0, 0) );
            this.box_2_transform = this.box_2_transform.times( Mat4.rotation(Math.PI * dt, 0, 1, 0) );
        }

        // TODO:  Draw the required boxes. Also update their stored matrices.
        // You can remove the following line.
        // this.shapes.axis.draw(context, program_state, model_transform, this.materials.phong.override({color: hex_color("#ffff00")}));
        this.shapes.box_1.draw(context, program_state, this.box_1_transform, this.materials.cube1);
        this.shapes.box_2.draw(context, program_state, this.box_2_transform, this.materials.cube2);
    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                
                vec2 scaled_coord = f_tex_coord - vec2(mod(animation_time * 2.0, 4.0) , 0.0);
                vec4 tex_color = texture2D( texture, f_tex_coord - vec2(mod(animation_time * 2.0, 4.0) , 0.0));
                                
                float u = mod(scaled_coord.x, 1.0);
                float v = mod(scaled_coord.y, 1.0);
                if (
                    (v > 0.75 && v < 0.85 && u < 0.85 && u > 0.15) ||
                    (v > 0.15 && v < 0.25 && u < 0.85 && u > 0.15) ||
                    (v < 0.85 && v > 0.15 && u > 0.75 && u < 0.85) ||
                    (v < 0.85 && v > 0.15 && u > 0.15 && u < 0.25)
                ) {
                    //tex_color = texture2D(0.0, 0.0, 0.0, rotation * (f_tex_coord.xy - 0.5) + 0.5);
                    tex_color = vec4(0, 0, 0, 1.0);
                    //tex_color = tex_color.times(rotation);
                }
                
                if( tex_color.w < .01 ) discard;  
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                
                float a = 3.14 * 0.5 * mod(animation_time, 4.0);
                mat2 rotation = mat2(cos(a), sin(a), -sin(a), cos(a));
                vec2 scaled_coord = rotation * (f_tex_coord.xy - 0.5) + 0.5;
                vec4 tex_color = texture2D( texture, scaled_coord);         
                
                // black out wrt to the scaled tex coord
                float u = mod(scaled_coord.x, 1.0);
                float v = mod(scaled_coord.y, 1.0);
                if (
                    (v > 0.75 && v < 0.85 && u < 0.85 && u > 0.15) ||
                    (v > 0.15 && v < 0.25 && u < 0.85 && u > 0.15) ||
                    (v < 0.85 && v > 0.15 && u > 0.75 && u < 0.85) ||
                    (v < 0.85 && v > 0.15 && u > 0.15 && u < 0.25)
                ) {
                    //tex_color = texture2D(0.0, 0.0, 0.0, rotation * (f_tex_coord.xy - 0.5) + 0.5);
                    tex_color = vec4(0, 0, 0, 1.0);
                    //tex_color = tex_color.times(rotation);
                }
                
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

