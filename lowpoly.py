from PIL import Image
import numpy as np
from selenium import webdriver
from skimage import filters, morphology
from scipy.spatial import Delaunay
import pandas as pd

class LowPoly:
    def __init__(self, filename) -> None:
        #Open image as numpy array
        self.image = np.array(Image.open(filename))
        self.grayscale_image = self.image.dot([0.07, 0.72, 0.21]).astype("uint8")
        self.shape = self.grayscale_image.shape
        self.height, self.width = self.shape[:2]

    def __get_max_points(self, array):
        y, x = np.unravel_index(np.argmax(array), array.shape)
        return x,y

    def __gaussian_mask(self, x, y, shape, amplitude, sd):
        '''
            Return gaussian mask of given shape centered around x, y cordinate
        '''
        xv, yv = np.meshgrid(np.arange(shape[1]), np.arange(shape[0]))
        mask = amplitude * np.exp(-((xv - x) ** 2 + (yv - y) ** 2) / (2 * sd ** 2))
        return mask

    def generate_max_entropy_points(self, n_points):
        length_scale = np.sqrt(self.width*self.height / n_points)
        entropy_radius = length_scale*0.15;
        gmask_aplitude = 3
        gmask_sd = length_scale * 0.3;
        
        #Appllying entropy filter
        filtered_image = filters.rank.entropy(self.grayscale_image, morphology.disk(entropy_radius));

        points = []
        for i in range(n_points):
            x, y = self.__get_max_points(filtered_image)
            points.append((x,y))
            filtered_image -= self.__gaussian_mask(x, y, self.shape, gmask_aplitude, gmask_sd)

        #Adding cornor points
        points.append((0,0))
        points.append((self.width-1, 0))
        points.append((0,self.height-1))
        points.append((self.width-1,self.height-1))
        self.points = np.array(points)
            

    def generate_triangles(self):
        self.triangles = Delaunay(self.points)

        #List of all pixel cordinate
        xv, yv = np.meshgrid(np.arange(self.width), np.arange(self.height))
        pixel_coords = np.c_[xv.ravel(), yv.ravel()]

        triangles_per_coord = self.triangles.find_simplex(pixel_coords)

        '''
            triangle |  r  |  g  |  b  |
                0    | 244 | 156 | 23  |
                1    | 242 | 256 | 22  |
                0    | 234 | 100 | 28  |
                2    | 123 | 199 | 23  |
            
            Create Pandas dataframe of each pixel in above format
            to easily group each pixel by the triangle they belong to and
            calculate the median of rgb values of each pixel on that each triangle.
        '''
        df = pd.DataFrame({
            "triangle": triangles_per_coord,
            "r": self.image.reshape(-1, 3)[:, 0],
            "g": self.image.reshape(-1, 3)[:, 1],
            "b": self.image.reshape(-1, 3)[:, 2]
        })

        n_triangles = self.triangles.simplices.shape[0]

        color_per_triangle = (
            df
                .groupby("triangle")[["r", "g", "b"]]
                .aggregate(np.median)
                .reindex(range(n_triangles), fill_value=0)
        )

        self.triangles_color = color_per_triangle.values.astype("uint8")


def draw_triangles_in_desmos(lowpoly, browser):
    pass

if __name__=="__main__":

    lowpoly = LowPoly('image.png');

    # Initializing Selenium for opening desmos
    browser = webdriver.Chrome()
    browser.get("https://desmos.com/calculator")

    #Generate Triangles
    lowpoly.generate_max_entropy_points()
    lowpoly.generate_triangles()

    draw_triangles_in_desmos(lowpoly, browser=browser)


    
