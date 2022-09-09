from PIL import Image
import numpy as np
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from skimage import filters, morphology, util
from scipy.spatial import Delaunay
import pandas as pd
from argparse import ArgumentParser

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
        gfilter_radius = length_scale*0.1;

        #Apply Gaussian filter on image to make it image smooth 
        smooth_image = util.img_as_ubyte(filters.gaussian(self.grayscale_image, gfilter_radius))
        
        #Appllying entropy filter
        filtered_image = filters.rank.entropy(smooth_image, morphology.disk(entropy_radius));

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


def draw_triangles_in_desmos(lowpoly, browser, n_triangle=1):
    '''
        n_triangles is the number of triangles to draw at a time.
        It looks cool to see picture being made piece by piece but sometimes it can be too slow.
        -1 = all at once
    '''
    hwidth = lowpoly.width/2
    hheight = lowpoly.height/2

    expression_list = []

    # Calc is the Calculator object in desmos.
    expression_layout = "Calc.setExpression({{ latex: `\\\operatorname{{polygon}}({},{},{})`, fillOpacity: '1', fill: 'true', color: '#{:x}{:x}{:x}' }});"

    vertices = lowpoly.triangles.points
    for triangle, color in zip(lowpoly.triangles.simplices, lowpoly.triangles_color):
        expression = expression_layout.format( *[(vertices[i][0]-hwidth, -(vertices[i][1]-hheight)) for i in triangle], *[i for i in color] )
        expression_list.append(expression)

    if(n_triangle == -1):
        browser.execute_script("".join(expression_list))
    else:
        for i in range(0, len(expression_list), n_triangle):
            current_expression_list = expression_list[i:i+n_triangle]
            browser.execute_script("".join(current_expression_list))


if __name__=="__main__":

    parser = ArgumentParser(description='Genrate Lowpoly image on Desmos Graph')
    parser.add_argument('imagefile', metavar='ImageFile',
            help='Filepath of an image to convert.')
    parser.add_argument('-p', '--points', type=int, 
            help='No of points used while generating triangle. (More points = More details = More Processing Time) (Default: Calculated based on image size)')
    parser.add_argument('-t', '--triangles', nargs='?', type=int, const=1, default=1, 
            help='No of triangle to draw at a time. -1 for drawing all at once (Default 1)')

    arguments = parser.parse_args()

    lowpoly = LowPoly(arguments.imagefile);

    # Initializing Selenium for opening desmos
    browser = webdriver.Chrome()
    browser.get("https://desmos.com/calculator")

    #Generate Triangles
    points = 1
    if(arguments.points is None):
        points = max(points, int(lowpoly.width*lowpoly.height/2500)) # 1 point for 50x50px area
    else:
        points = arguments.points
    
    lowpoly.generate_max_entropy_points(points)
    lowpoly.generate_triangles()

    WebDriverWait(browser, timeout=10).until( lambda driver: (driver.execute_script("return typeof Calc;") == "object") )
    draw_triangles_in_desmos(lowpoly, browser=browser, n_triangle=arguments.triangles)


    
