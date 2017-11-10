<?php
function understrap_remove_scripts() {
    wp_dequeue_style( 'understrap-styles' );
    wp_deregister_style( 'understrap-styles' );

    wp_dequeue_script( 'understrap-scripts' );
    wp_deregister_script( 'understrap-scripts' );
		wp_deregister_script( 'jquery-slim' );  //MW edit for AJAX! (not in slim!)
    // Removes the parent themes stylesheet and scripts from inc/enqueue.php
}
add_action( 'wp_enqueue_scripts', 'understrap_remove_scripts', 20 );

add_action( 'wp_enqueue_scripts', 'theme_enqueue_styles' );
function theme_enqueue_styles() {

	// Get the theme data
  	$the_theme = wp_get_theme();
//    if (!is_admin()) {
        // comment out the next two lines to load the local copy of jQuery
        wp_deregister_script( 'jquery' );
        wp_register_script( 'jquery', '//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', false, '1.9.1' );
        wp_enqueue_script( 'jquery' );
//    }

   $min='.min'; //show full version locally
   if( stripos($_SERVER['SERVER_NAME'],'local.') !== false )  $min='';
    wp_enqueue_style( 'child-understrap-styles', get_stylesheet_directory_uri() . '/css/child-theme'.$min.'.css', array(), $the_theme->get( 'Version' ) );
	  wp_enqueue_script( 'popper-scripts', get_template_directory_uri() . '/js/popper.min.js', array(), false);
    wp_enqueue_script( 'child-understrap-scripts', get_stylesheet_directory_uri() . '/js/child-theme'.$min.'.js', array('jquery'), $the_theme->get( 'Version' ), true );
}

// Remove [...]
add_filter( 'the_excerpt', function($text){
 return str_replace(array('[&hellip;]','[&#8230;]'), '' , $text);
});
