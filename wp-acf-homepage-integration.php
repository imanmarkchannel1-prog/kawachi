<?php
/**
 * Plugin Name: Kawachi Homepage Settings ACF REST API
 * Description: Automatically registers the "Homepage Settings" ACF Field Group via code and exposes a custom REST API endpoint under /wp-json/custom/v1/homepage.
 * Version: 1.0.0
 * Author: Kawachi Team
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// 1. Automatically Register the Homepage Settings Options Page in the WordPress Sidebar Menu
add_action( 'acf/init', 'register_kawachi_acf_options_page' );
function register_kawachi_acf_options_page() {
    if ( function_exists( 'acf_add_options_page' ) ) {
        acf_add_options_page( array(
            'page_title' => 'Homepage Settings',
            'menu_title' => 'Homepage Settings',
            'menu_slug'  => 'acf-options-homepage-settings',
            'capability' => 'edit_posts',
            'redirect'   => false,
            'icon_url'   => 'dashicons-admin-home',
            'position'   => 30,
        ) );
    }
}

// 2. Automatically Register ACF Field Group via PHP
add_action( 'acf/init', 'register_kawachi_homepage_acf_field_group' );
function register_kawachi_homepage_acf_field_group() {
    if ( function_exists( 'acf_add_local_field_group' ) ) {
        acf_add_local_field_group( array(
            'key' => 'group_homepage_settings',
            'title' => 'Homepage Settings',
            'active' => true,
            'fields' => array(
                // 1. Top Banners Repeater Field
                array(
                    'key' => 'field_top_banners',
                    'label' => 'Top Banners',
                    'name' => 'top_banners',
                    'type' => 'repeater',
                    'instructions' => 'Manage the primary slide carousel banners at the top of the homepage.',
                    'layout' => 'row',
                    'button_label' => 'Add Slide',
                    'sub_fields' => array(
                        array(
                            'key' => 'field_banner_image',
                            'label' => 'Banner Image',
                            'name' => 'banner_image',
                            'type' => 'image',
                            'return_format' => 'url',
                            'preview_size' => 'medium',
                            'required' => 1,
                        ),
                        array(
                            'key' => 'field_banner_link',
                            'label' => 'Banner Link',
                            'name' => 'banner_link',
                            'type' => 'url',
                            'required' => 1,
                        ),
                    ),
                ),
                // 2. Shoppable Video Group Field
                array(
                    'key' => 'field_shoppable_video',
                    'label' => 'Shoppable Video',
                    'name' => 'shoppable_video',
                    'type' => 'group',
                    'instructions' => 'Select a spotlight product and link it to an influencer/promotional video.',
                    'layout' => 'block',
                    'sub_fields' => array(
                        array(
                            'key' => 'field_video_url',
                            'label' => 'Video URL',
                            'name' => 'video_url',
                            'type' => 'text',
                            'placeholder' => 'https://www.youtube.com/embed/... or .mp4 URL',
                            'required' => 1,
                        ),
                        array(
                            'key' => 'field_linked_product',
                            'label' => 'Linked Product',
                            'name' => 'linked_product',
                            'type' => 'post_object',
                            'instructions' => 'Select a WooCommerce product linked directly to this shoppable video.',
                            'post_type' => array( 'product' ),
                            'taxonomy' => '',
                            'allow_null' => 0,
                            'multiple' => 0,
                            'return_format' => 'id',
                            'required' => 1,
                        ),
                    ),
                ),
                // 3. Promo Banners Repeater Field
                array(
                    'key' => 'field_promo_banners',
                    'label' => 'Promo Banners',
                    'name' => 'promo_banners',
                    'type' => 'repeater',
                    'instructions' => 'Manage the middle promo boxes (supports triple row banners).',
                    'layout' => 'row',
                    'button_label' => 'Add Promo Banner',
                    'sub_fields' => array(
                        array(
                            'key' => 'field_promo_image',
                            'label' => 'Banner Image',
                            'name' => 'banner_image',
                            'type' => 'image',
                            'return_format' => 'url',
                            'required' => 1,
                        ),
                        array(
                            'key' => 'field_promo_link',
                            'label' => 'Banner Link',
                            'name' => 'banner_link',
                            'type' => 'url',
                            'required' => 1,
                        ),
                    ),
                ),
            ),
            'location' => array(
                array(
                    array(
                        'param' => 'options_page',
                        'operator' => '==',
                        'value' => 'acf-options-homepage-settings',
                    ),
                ),
            ),
            'menu_order' => 0,
            'position' => 'normal',
            'style' => 'default',
            'label_placement' => 'top',
            'instruction_placement' => 'label',
            'hide_on_screen' => '',
        ) );
    }
}

// 2. Expose the ACF Homepage Options Page Custom fields to a Secure REST API endpoint
add_action( 'rest_api_init', 'register_kawachi_acf_homepage_rest_route' );
function register_kawachi_acf_homepage_rest_route() {
    register_rest_route( 'custom/v1', '/homepage', array(
        'methods'             => 'GET',
        'callback'            => 'get_kawachi_homepage_acf_data',
        'permission_callback' => 'verify_kawachi_homepage_rest_access',
    ) );
}

/**
 * REST API Read Verification Handler
 * Since this endpoint serves public visual configs, read-only GET requests are allowed publicly.
 */
function verify_kawachi_homepage_rest_access( $request ) {
    return true; // Return true for public accessibility, or implement key validation if required.
}

/**
 * REST API Request Callback
 */
function get_kawachi_homepage_acf_data( $request ) {
    $front_page_id = get_option( 'page_on_front' );
    
    // Fallback: search for page named 'Home' if no static front page is designated in Settings
    if ( ! $front_page_id ) {
        $pages = get_posts( array(
            'post_type'   => 'page',
            'title'       => 'Home',
            'numberposts' => 1,
        ) );
        if ( ! empty( $pages ) ) {
            $front_page_id = $pages[0]->ID;
        }
    }
    
    // Read front page post fields
    $top_banner_1 = $front_page_id ? get_field( 'top_banner_1', $front_page_id ) : null;
    $top_banner_2 = $front_page_id ? get_field( 'top_banner_2', $front_page_id ) : null;
    $top_banner_3 = $front_page_id ? get_field( 'top_banner_3', $front_page_id ) : null;

    // Read options page fields
    $top_banners = get_field( 'top_banners', 'option' );
    $shoppable_video = get_field( 'shoppable_video', 'option' );
    $promo_banners = get_field( 'promo_banners', 'option' );

    // Build responsive structured JSON payload
    $payload = array(
        'top_banner_1'    => $top_banner_1,
        'top_banner_2'    => $top_banner_2,
        'top_banner_3'    => $top_banner_3,
        'top_banners'     => is_array( $top_banners ) ? $top_banners : array(),
        'shoppable_video' => is_array( $shoppable_video ) ? $shoppable_video : array(
            'video_url'      => '',
            'linked_product' => null
        ),
        'promo_banners'   => is_array( $promo_banners ) ? $promo_banners : array(),
    );

    return new WP_REST_Response( $payload, 200 );
}
