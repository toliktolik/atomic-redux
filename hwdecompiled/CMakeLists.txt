cmake_minimum_required(VERSION 3.16)
project(HeavyWeaponDeluxe)

set(CMAKE_C_STANDARD 99)

# Include directories
include_directories(.)

# Collect all source files
file(GLOB_RECURSE SOURCES "*.c")

# Create library
add_library(heavy_weapon_deluxe STATIC ${SOURCES})
