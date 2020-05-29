import sys
import csv
import math
import os


def main():
    if len(sys.argv) != 2:
        return

    relevance_container = sys.argv[1]

    if not os.path.isdir(relevance_container):
        return

    step_sizes = [3, 5, 7, 10]
    relevance_files = [f for f in os.listdir(relevance_container) if os.path.isfile(os.path.join(relevance_container, f))]

    with open("results_ndcg.csv","w") as out:
        out.write("scenario,variant,n,penalty,weight,strategy,ndcg\n")
        for relevance_file in relevance_files:
            folder = relevance_file.split("_")[0]
            if os.path.isdir(folder):
                scenario = os.path.splitext(relevance_file)[0]
                for n in step_sizes:
                    for candidate in os.listdir(folder):
                        if os.path.isfile(os.path.join(folder, candidate)) and candidate.startswith(scenario):
                            handle_scenario(os.path.join(relevance_container, relevance_file),
                                            os.path.join(folder, candidate),
                                            n,
                                            out)


def handle_scenario(relevance_path, source_path, n, out=sys.stdout):
    relevance_dict = read_relevance(relevance_path)
    ranking_dict = process_ranking_file(source_path)

    ideal_dcg = compute_dcg(get_ideal_ranking(relevance_dict), relevance_dict, n)

    # scenario = os.path.splitext(os.path.basename(relevance_path))[0]
    temp = os.path.splitext(os.path.basename(source_path))[0].split("_")
    scenario = temp[0]
    variant = temp[1]
    penaltyWeight = int(temp[3][3:])
    weightVariant = temp[2]

    for strategy in ranking_dict:
        out.write("%s,%s,%d,%d,%s,%s,%f\n" % (scenario, variant, n, penaltyWeight, weightVariant, strategy, compute_ndcg(ranking_dict[strategy], relevance_dict, ideal_dcg, n)))


def read_relevance(path):
    relevance_dict = {}

    with open(path, "r") as file:
        csv_reader = csv.reader(file, delimiter=',')
        next(csv_reader, None) #skip header
        for row in csv_reader:
            if row[0] not in relevance_dict:
                relevance_dict[row[0]] = {}

            relevance_dict[row[0]][row[1]] = row[2]

    return relevance_dict


def process_ranking_file(path):
    read_results = False
    current_strategy = ""
    ranking = []

    ranking_dict = {}

    with open(path, "r") as file:
        for line in file:
            if line.startswith("strategy") and not read_results:
                # start reading a list of ranking entries
                read_results = True
                current_strategy = line.split(":")[1].strip()
                ranking = []
            elif read_results and line.startswith("--"):
                # end reading a list of ranking entries
                read_results = False
                ranking_dict[current_strategy] = ranking
            elif read_results and not line.startswith("#") and not line.startswith("runtime"):
                # process a single ranking entry
                ranking.append(line.split(",")[:3])

    return ranking_dict


def compute_ndcg(ranking, relevance, ideal_dcg, n=0):
    return compute_dcg(ranking, relevance, n) / ideal_dcg


def compute_dcg(ranking, relevance, n=0):
    dcg = 0

    if n == 0:
        m = len(ranking)
    else:
        m = min(n, len(ranking))

    score_dict = {}
    entry_score_dict = {}

    # basic ndcg adapted because of tied rankings
    # https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ecir2008.pdf

    for entry in ranking:
        score = entry[2]
        if score not in score_dict:
            score_dict[score] = 0
            entry_score_dict[score] = []
        score_dict[score] += 1
        entry_score_dict[score].append(int(relevance[entry[0]][entry[1]]))

    for idx in range(0, m):
        score = ranking[idx][2]
        rel = sum(entry_score_dict[score])/score_dict[score]
        dcg += rel / math.log2(idx + 2)

    # for idx in range(0, m):
    #     (rank, entry) = processed_ranking[idx]
    #     rel = int(relevance[entry[0]][entry[1]])
    #     sum += rel / math.log2(rank + 1)

    return dcg


def get_ideal_ranking(relevance_dict):
    ranking = []

    for source, target_dict in relevance_dict.items():
        for target, relevance in target_dict.items():
            ranking.append([source, target, relevance])

    ranking.sort(key=lambda item: item[2], reverse=True)

    return ranking


def preprocessRanking(ranking):
    if not ranking or len(ranking) < 1:
        return []

    score_dict = {}
    relevance_dict = {}

    for entry in ranking:
        score = entry[2]
        if score not in score_dict:
            score_dict[score] = 0
            relevance_dict[score] = []
        score_dict[score] += 1
        relevance_dict[score].append() # access to (real) relevance dict and add relevance based on entry 1 and 2

    result = []
    currentScore = ranking[0][2]
    currentRank = 1

    for idx, entry in enumerate(ranking):
        if currentScore != entry[2]:
            currentScore = entry[2]
            currentRank = idx + 1

        result.append((currentRank, entry))

    return result

if __name__ == "__main__":
    main()
